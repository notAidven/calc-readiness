# The Plague: design and asset brief

**Era:** 6, Early Modern
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era six's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

**Era six is the only one of the nine with no light instinct at all**, which makes it the easiest of
the nine to render and the hardest to make dramatic. Section 2 is written to that.

---

## 0. The hard boundary

**Read `./README.md` first.** The three that bite on era six:

1. **Nothing tints a building at runtime.** An infected building cannot be drawn by tinting it, and
   a closed one cannot be drawn by greying it. Both are **added geometry**, per sections 3 and 8.
2. **No image textures.** No painted plague cross on a door as a texture. The mark is a cut panel.
3. **No environment map.** Era six's lead domes are its accent and they cannot be lead-coloured
   *and* reflective. They are pale, faceted and flat-shaded, which is what they already are.

**What era six does not collide with:** nothing in this crisis wants a glow, a pool of light, a
flare or a beacon. **It is the only one of the nine that can be built exactly as designed**, and
that is worth knowing when the build order is chosen.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading;
`useFrame` animation gated on `prefers-reduced-motion`; **the shared ground-decal ladder, which is
where the whole link layer lives**; and the nine lighting numbers plus sky and fog.

---

## 1. The crisis, and what the player does

**The premise, in one line.** Something is moving through the town along the paths people take, and
you cannot see where it has already been.

**The ritual: I close movement links temporarily.** Era six is the only crisis of the ten where the
player's verb acts on **a connection rather than on a place**. Nothing is defended, nothing is
placed, nothing is destroyed. **A line between two buildings is closed, and later it is opened
again.**

**The cadence: answer to earn permission, then accept a cost.** Shared with era five, and they are
adjacent. Section 1.1 covers what holds them apart.

**Duration: supply exhaustion.** It ends when **no infected building has an active link to a clean
one**. That has a consequence worth building the surface around: **suspending a route is a way to
shorten the crisis, not only to limit it.** A player who cuts the right link ends the outbreak
sooner, and the read-out panel should say so.

**Spread: through use and shared routes.** Along **a few visible links** between the buildings
people visit. **Never through tile adjacency**, and two linked buildings may sit on opposite sides
of the settlement. That last point is not incidental; it is the whole topology.

> **"A few visible links" is a constraint, not a suggestion.** The spread-through-use design was
> chosen *because* it could be done with a handful of drawn lines. **No commuter agents, no
> per-citizen itineraries, no trip volumes, no schedules, no exposure counters, no probability of
> transmission per visit.** A link exists or it does not; it is open or suspended. Anything that
> asks the player to reason about how much traffic a link carries has crossed the line.

**Resolution is batched.** Infections travel **at the end of a cycle**. The player closes a link and
then finds out where the disease had already gone. Section 4.4 specifies that beat, and it is the
axis that separates era six from era five.

**Entry.** After `ceil(n / 2)` of era six's six nodes (`GEO.1`, `GEO.2`, `CG.1`, `POL.6`, `POL.7`,
`RAT.5`), which is **three**.

### 1.1 Era six against era five, in the hand

| | Era five | Era six |
| --- | --- | --- |
| What the spread follows | Tile adjacency | **Human movement**, along authored links |
| What the player sacrifices | Structures, permanently | **Access and capacity**, temporarily |
| **How consequences resolve** | Immediately | **At the end of a cycle** |

**The batching is a presentation requirement.** A closure that resolved immediately would collapse
the third axis and it would look like a responsiveness improvement to whoever did it. **Section 4.4
specifies the two beats.**

### 1.2 Era six against era seven, which is the pair worth watching

D-CRISIS-8 deliberately moved the Plague onto a link layer the Boiler Cascade also wants, so the two
are now **closer in machinery and further apart in semantics**. The spec's own warning: the Plague's
edges are a hazard the player wants to **cut**, and the Cascade's are a supply line the player wants
**intact**. An identical visual language would invite a player to sever era seven's network, which
is the correct move in era six and the destructive one in era seven.

**This brief's answer, and it is the cheapest possible one:**

> **Era six's links are IN the floor. Era seven's are ON it.**
>
> Era six inlays a line in the paving, flat, walkable, part of the ground. Era seven runs a pipe on
> sleepers, raised, structural, something you would not step on. One is a path people take; the
> other is a thing that feeds something. **The two read as opposite kinds of object at a glance and
> they share one implementation.**

**Build the layer selectable and directional whoever goes first.** Era six alone needs edges to be
clickable, and era seven's are directed. A layer scoped to "undirected lines, because that is all
the Plague needs" is a layer era seven has to reopen, and directionality is expensive to retrofit
into hit-testing, routing and the preview.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the town has shut itself down.

**The hard part, stated honestly.** Era six's crisis has no weather, no fire, no hostile and no
light. **The atmosphere is carried entirely by absence**, and absence is hard to draw. The good news
is that era six is the era whose whole identity is **composition**, and **a composed square with
nobody in it is one of the most legible images in the whole run.**

**The constraint:** era six's floor in the ground ladder is **geometric paving**: large slabs in a
deliberate pattern that survives across the whole open ground rather than stopping at each building,
with broad shallow flights and moulded steps, dressed channels and drain grates, flat and true.
**None of that changes**, and the crisis is drawn into it rather than over it.

### 2.1 The light

**The direction: high thin overcast, and the correct read is "a day nobody went out in".** Not dark,
not stormy, not dusk. Even, shadowless and slightly cold.

| Lever | Era six's day preset today | Plague direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Neutral, near white.** Any warmth reads as a nice day |
| Key intensity | 1.32 | **Well down.** Hard shadow is the loudest "life is happening" cue on a paved square |
| Key angle | Low and raking | **High and flat.** A long raking shadow across a composed pavement is beautiful and it is the wrong picture |
| Hemisphere sky | `#CFE6F6` | Paler and colder |
| Hemisphere ground | `#C08F57` warm earth | **Cool stone.** Era six's ground is dressed stone and the bounce should be it |
| Hemisphere intensity | 0.95 | **Up.** Under thin overcast most of the light is ambient, and it is what makes the scene shadowless |
| Ambient | `#F5EFE2` at 0.30 | Up slightly, and cooler |
| Rim | `#BFDCEF` at 0.48 | **Keep.** Silhouette separation is what makes the empty square read as architecture rather than as a flat field |
| Background (sky) | `#BFE1F2` clear blue | **A flat pale grey with the barest blue in it.** No horizon warmth |
| Fog colour | `#D6ECF7` | Match the sky |
| Fog near and far | `radius x 3` to `radius x 20` | Leave roughly alone. **Era six wants clarity**: the whole point is that everything is visible and empty |

**The trap: do not make it gloomy.** A dark plague town is the obvious move and it fights the era,
which is pale stucco under lead. **Pale, even and empty is more unsettling than dark**, and it is
also what the era's materials actually do under an overcast sky.

### 2.2 Ground, and the link layer

**Era six's ground already contains the crisis's central object.** The era's props kit carries **a
meridian line inlaid in a walk** and **a bench mark cut into paving with an arrow under it**. This
is a town that draws lines in its own floor.

> **The link layer is inlaid lines in the paving.** A link between two buildings is a narrow inlaid
> band running across the ground from one to the other, flat, on the shared decal ladder, sitting
> **within** the paving pattern rather than on top of it.

That is era six's signature move applied to the crisis: a drawing made physical.

**Why in the ground rather than in the air.** Three reasons and each alone would be sufficient. It
is era-correct. It costs nothing, because the decal ladder is the cheapest place in the renderer to
put new art. And it separates era six's links from era seven's by kind rather than by colour, per
section 1.2.

**Link states, and each carries at least two channels:**

| State | Geometry | Second channel |
| --- | --- | --- |
| **Open** | Inlaid band, flush, continuous | Its ends meet both buildings' thresholds |
| **Suspended** | The band is **interrupted at its midpoint by a raised barrier stone** across it | The band's inlay goes matte and recessed either side of the stone |
| **Carrying the outbreak** | The band gains a **row of cut notches** along its length | Notches are geometry and they read at zoom-out where an inlay alone might not |

**No arrowheads.** Era six's links are undirected. Era seven's directed version of the same
primitive adds cut arrowheads, which is what makes the two eras' networks read differently while
sharing an implementation.

**The reach question.** Under #298 era
six's buildable radius is **51** against a drawn grass radius of **30**. **Era six lays no per-cell
ground layer** (the link bands are per-link, not per-cell), so the clipping problem is smaller here
than in eras three, five, seven, eight, nine and ten. **The link bands must still clip to the drawn
island**, because a link between two outlying buildings could route across ground that is not drawn.

### 2.3 Vegetation

**Era six's planting is formal and it stays formal.** Clipped hedging, citrus in terracotta pots,
bay in tubs, topiary cones, a gravel walk with a raked edge.

**One change, and it is the best image in this section:** **the gravel walk is raked and there are
no footprints in it.** A formal garden maintained and unwalked says the town has stopped moving
better than any amount of dressing. It is a treatment on existing geometry and it costs almost
nothing.

**Nothing is overgrown and nothing wilts.** The outbreak is short and the gardeners are still alive.

### 2.4 Water and shoreline

**Largely unchanged.** Era six's guide spends its change budget on the ground pattern rather than on
the water, and the crisis should not be the thing that alters it.

Two additions, both small:

- **The quay is quiet.** Nothing being unloaded, nothing stacked. Prop absence, no new asset.
- **A boat standing off, not landing.** One hull, out past the mole, holding position. **The
  quarantine read from outside**, and it is one mesh.

### 2.5 Signs of habitation at the margins

**A town in the middle of doing something careful, that stopped.** All from era six's own kit:

- **The plane table on its tripod, abandoned mid-survey**, with the surveying rods still standing
  where they were set. **The strongest single image available to this crisis**: era six's identity
  is measurement, and a half-finished survey is that identity interrupted.
- **The model on its stand, under a cloth.**
- **Printed sheets rolled and stacked**, a pinned-up engraved plan curling at its corners with
  nobody reading it.
- **The stone benches empty**, the balustrade run with nobody at it.
- **Shutters closed on the upper storeys**, generally, across the town. Not the crisis's own closure
  marker (that is section 8) but the ordinary shutters of a town staying indoors.

### 2.6 Does anything move

**Almost nothing, and less than any other of the nine.** Era six's crisis is the stillest scene in
the folder.

- **Nothing at all in the town.** No people, no carts, no smoke.
- **The boat standing off moves slightly**, which is the only motion in the frame and it is outside
  the town, which is the point.
- **Every animation is gated on `prefers-reduced-motion`.**
- **Nothing that moves may advance the encounter.**

### 2.7 The transition, in and out

**In:** the lighting numbers, the flat grey sky, the inlaid link bands appearing in the paving, the
first infected building's marker, the shutters closing, the survey stopping.

**What never changes:** the buildings, the paving pattern, the steps and channels, the island's
geometry, the shoreline.

**Out, and era six's exit is unlike any other of the nine.** The crisis spec records that **the
Plague is the only crisis of the ten that leaves no trace once it is over**: capacity lifts
automatically, nothing was destroyed, and there is no bill.

So the exit is: **the barrier stones come up, the inlay goes flush, the markers go from the doors,
the shutters open, and the surveyor comes back to the plane table.** Whether the town should keep
*some* residue is carried in the crisis spec as **O-10** and is [Q1](#13-open-questions) here.

### 2.8 The read, in one sentence

*The same measured town under a flat grey sky with nobody in it, lines inlaid across the paving from
door to door, a barrier stone across two of them, and a survey left standing where somebody put it
down.*

---

## 3. The hazard

### 3.1 The three questions the board must answer

1. **Which buildings are infected?** As far as the player knows.
2. **What are they linked to?** The links are visible at all times. **This is the ruling**, and it
   is what makes the crisis a topology puzzle rather than a guessing game.
3. **What travelled last cycle?** Because resolution is batched, the player finds out at the end of
   a cycle, and the board has to show them what moved.

### 3.2 The infected building

**Added geometry at the door**, because nothing tints a building at runtime.

Era six's kit carries **a pedestal with nothing on it**, described as more useful than a full one.
The crisis uses it: **an infected building has a pedestal at its threshold carrying a covered
vessel.** Period-correct (a vinegar vessel or a smoke pot at a door), a silhouette change at the
building's edge, and it needs no new material.

| State | What is drawn | Channels |
| --- | --- | --- |
| **Clean** | The building as authored | (none) |
| **Infected** | **A pedestal with a covered vessel at the threshold**, and the links from it carry notches | Silhouette at the door, notched link bands, status line |
| **Closed by the player** | **Shutter plates** and a **barred panel over the door** (section 8) | Silhouette change across the elevation, plus the panel |
| **Infected and closed** | Both | Both, and the two must be separately readable |

**The last row is the one to get right.** A player must be able to see that a building is both
infected and closed, because those are different facts with different consequences, and a treatment
that merged them would hide half the board.

### 3.3 The partly hidden half, which is the design's most delicate point

The lead's contrast calls the movement network *"partly hidden"* and the implementation calls the
links *"visible"*. **The reading that makes both true, and the one this brief is drawn on: the links
are visible and the infection travelling along them is not.** You can see the network and you cannot
see everywhere the disease has already reached.

**Presentationally that means:**

- **Links are always drawn, in full, from the first turn.** No fog, no discovery, no unlocking.
- **Infection markers appear only when a cycle resolves.** During a cycle the player is looking at a
  network and a set of known infections, and deciding on incomplete information.
- **There is no "probably infected" state.** That is era nine's, it is protected by D-CRISIS-22, and
  giving era six a confidence grade would collapse the two.

**The alternative reading, that some links are themselves unknown until used, is not ruled** and is
carried in the crisis spec as O-10. It is [Q2](#13-open-questions) here. **It would change section
2.2 substantially**, so it is worth settling before the link layer is built.

### 3.4 The cycle resolution, which is the crisis's own beat

**At the end of a cycle, infections travel.** The board's job is to show what moved, in one legible
pass:

- **Each link that carried the outbreak gains its notches**, in order along its length from the
  source end to the destination end. **One interpolation, player-advanced**, not a timed animation.
- **The newly infected buildings get their pedestals**, after the notches arrive at them.
- **Then the board settles and the player acts again.**

**Under `prefers-reduced-motion` the whole resolution is a single posed frame**: notches present,
pedestals present, no travel.

---

## 4. The player's own mark

**The barrier stone.** Era six's player closes a link, and the mark of a closed link is a raised
stone set across the inlaid band at its midpoint.

### 4.1 Why a stone and not a gate

Era three's player closes a road with a gate, which is a structure with hinges. **Era six's closure
is administrative, not physical:** the town has decided that people will not go this way. A **plain
dressed stone set across a line in the floor** is the right object for a decision made on paper and
enacted in the street, and it is era six's material vocabulary exactly.

### 4.2 The three rungs

Accuracy sizes the action and never decides whether it happens. Era six's cadence is *"answer to
earn permission or duration"*, and **duration is the interesting half**, because the ruling's own
question for this era is *"what do I shut down, and for how long?"*

| Rung | How long the closure holds | On the board |
| --- | --- | --- |
| **1 right** | The link closes for **one cycle** | One barrier stone, with **one cut band** round it |
| **2 right** | It closes for **two cycles** | One stone, **two bands** |
| **3 right** | It closes **until the outbreak ends** | One stone, a **full collar**, and the band's inlay is recessed along its whole length |

**The band count on the stone is the duration read**, and it is a countable non-colour channel, which
is what INV-CRISIS-16 wants. **A closure that has expired is a stone with no bands**, which is a
different silhouette from a stone that was never set.

**Whether duration is what accuracy sizes is [Q3](#13-open-questions).** The ruled cadence says
*"permission or duration"* and does not choose. Duration is drawn here because it is the reading
under which era six's own question has an answer.

### 4.3 The two verbs

The crisis spec gives the player three things to do: close gathering places, quarantine buildings,
and suspend routes. **Presentationally that is two verbs**, and they act on different objects:

| Verb | Acts on | Mark |
| --- | --- | --- |
| **Suspend a route** | **A link** | Barrier stone across the band |
| **Close a building** | **A node** | Shutter plates and a barred door panel |

**Closing a building is closing all of its links at once**, which is why it costs more capacity and
why it is the heavier move. **The board should show that**: when a building closes, **every band
touching it gets a barrier stone**, from the same closure.

### 4.4 The beat, which is a hard requirement

**Two beats, in this order, always:**

1. The player commits a closure. **The barrier stone appears immediately.** The player's own action
   is never delayed; only its consequence is.
2. The player advances the cycle. **Then infections travel**, per section 3.4.

**The gap between those two beats is the crisis.** A player who could see the result of a closure
before advancing would be playing era five.

---

## 5. The crisis surface

### 5.1 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.**

Rail order:

1. **Header**: the crisis name, and **how many buildings are infected**, as a count.
2. **The network summary**: how many links are open, how many are suspended, and how many still run
   from an infected building to a clean one. **That last number is the terminal condition** and it
   is the most useful thing on the screen: when it reaches zero the crisis ends.
3. **The action cards.**
4. **The read-out panel** when a closure is armed.
5. **The advance control**, which is separate from the commit control and is the thing that ends the
   cycle.

**Era six is the only one of the nine where the advance control is a first-class element**, because
the batched resolution means "I have finished acting" is a decision.

### 5.2 At 460

Single column, **board first**. The board crops to the infected set and their links. **A link whose
far end is off-crop is the crisis's worst failure mode at this width**, so the crop must be computed
from the link set rather than from the buildings.

**The network summary never collapses.** It is three numbers and the third is the win condition.

### 5.3 The hierarchy

**The links are the subject.** Era six is the only crisis in the ten where the lines matter more
than the things they join, and the layout should make a player look at the floor.

---

## 6. The option cards

### 6.1 The actions

| Action | Kind of answer | Glyph |
| --- | --- | --- |
| **Suspend a route** | **The topology answer.** Cut one edge | Two dots with a barred line between them |
| **Close a building** | The heavier answer: cut every edge at one node | A dot with barred lines radiating from it |
| **Reopen a route** | The inverse, and era six's own trick: capacity comes back and the risk returns | Two dots with a clear line between them |

### 6.2 The card

428 units wide, about 104 tall, with a cost zone.

- **A 40 unit action glyph** on the left, from the table above. **The three glyphs are a small graph
  vocabulary** and they should be visibly one family, because they are three operations on one
  structure.
- **The action name**, the target (a route names both ends), and a one-line statement.
- **A cost zone** carrying **what capacity this suspends**, by name: *"Closes the Fairground.
  Happiness down 12 while it is shut."*

**The cost zone matters more here than in most of the nine**, because era six's cost is invisible on
the island: nothing breaks, so the only place the player learns what a closure costs is the card.

### 6.3 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2, card lifts 1, **no colour change**, and **the link or node it acts on raises on the board**, with its far end raised too so the player can see both ends of a long link |
| **Armed** | 3-unit border, corner flag with a check glyph, **Chosen**, `aria-pressed="true"` |
| **Unavailable** | **The reason replaces the ladder**: *"Already suspended for two more cycles."* `disabled`, `aria-describedby` |
| **Committed** | 6-unit diagonal hatch, declared line replacing the body |

### 6.4 Selecting a link on the board

**Era six is the only crisis whose player verb acts on an edge**, so the board needs edge
hit-testing. A thin inlaid band is a hard pointer target, so:

- **The hit target is a wide invisible strip along the band**, at least 12 units wide in screen
  space at the default zoom.
- **A hovered link raises along its whole length**, both ends together. This is the only affordance
  that tells a player two distant buildings are one link.
- **Every link is also reachable from the DOM** as a button in the rail's link list, which is the
  accessible path and is not an afterthought: a thin diagonal target is hard for a pointer and
  impossible for a keyboard.

---

## 7. The read-out panel

### 7.1 What it is for

The player has armed a closure. **The question is "does cutting this actually separate anything, and
what does it cost me while it is cut?"**

### 7.2 The direction

- **Lead with what it separates.** *"This cuts the Printing House off from the Fairground and the
  three buildings beyond it."* **That is the answer to a topology question and it is what the player
  is asking.**
- **Then what it costs**, from the cost zone, by name and by capacity.
- **Then whether it shortens the crisis.** Era six's terminal condition is that no infected building
  has an active link to a clean one, so a closure that reduces that count is progress toward the
  end, and the panel should say so: *"Two links left from an infected building to a clean one."*
- **Show the reachable set as a plan.** A small diagram of the nodes and edges with the cut edge
  marked and the separated set outlined. **The board already draws this figure** and the panel is a
  second view of it.
- **Say when it changes nothing.** If the disease reaches the same set by another link, that is the
  finding: *"It still reaches the Fairground by the Merchant Houses."*
- **No dashed borders.**

### 7.3 The provisional register

**A proposed closure is a raised outline of a barrier stone, not a stone.** The links it would cut
are **outlined along their length rather than notched**. The set it would separate carries a
**second, lighter outline** around the buildings in it. Committed marks are solid; proposed ones
frame.

---

## 8. Damage and consequence

**Era six sits furthest inside the failure floor of all ten crises.** It has **no destructive verb
at all**, so there is no implementation slip that could remove a building, because there is no
removal in its vocabulary to slip with.

### 8.1 The closed building

The shared **shutter plate**, in era six's own material:

| Stage | What is drawn | Channels |
| --- | --- | --- |
| **Open** | The building as authored | (none) |
| **Closed** | **Shutter plates**: painted timber shutters closed and barred across the openings, in the era's own joinery, plus a **barred panel over the door** | Silhouette change, plus the panel |
| **Reopened** | Plates off, panel gone | Absence |

**The door panel is era six's corner tag**, and it uses the era's own armorial panel format with the
device replaced by **a single cut bar**.

> **The bar is deliberately not a cross.** A cross is the historically obvious mark and it collides
> twice: `hw-cell__lose` already uses a cross glyph for "ground you would lose", and a cross reads
> as the wrong-answer mark on a screen that is also showing a batch verdict. **A single horizontal
> bar is unambiguous and unclaimed.**

### 8.2 Capacity, and how it differs from era two's

| | Era two, the Lost Herd | Era six, the Plague |
| --- | --- | --- |
| What triggers it | A failed search. **The consequence of failing** | **The player's own containment choice.** The price of the answer |
| How it ends | A repair action later, at a cost | **It lifts when the outbreak ends.** No bill, no action |
| After the crisis | Persists into the next era | **Gone** |

**This difference should be visible in the copy and in the panel**, because a player who thinks a
closure is permanent will not make it. Section 9 says *"while it is shut"* everywhere for this
reason.

### 8.3 The headroom collision, which is real and unresolved

The crisis spec recommends capping a crisis's capacity penalty at the settlement's available
**headroom**, so a penalty can only consume capacity nobody is using and the no-eviction guarantee
in `citizens.ts` survives by construction.

**Applied to era six that recommendation collides with itself.** A closure the player *needs* in
order to contain the outbreak might exceed the headroom and be refused, and INV-CRISIS-3 forbids a
board that cannot be won. It is also now a **boundedness** question: a refused closure leaves an
infected building with an active link, so the crisis does not progress toward its own terminal
condition either.

**Presentationally this needs an answer before the cards are built**, because a refused closure needs
its own card state and its own copy, and section 6 does not have one. [Q4](#13-open-questions).

### 8.4 The floor

Nothing is destroyed, nothing is removed, no node is relocked. **The obvious wrong implementation, a
`sick` citizen state, does not compile**: `citizens.ts` carries an exhaustive switch whose
banned-substring list includes `"sick"`, and the file states that *"nobody starves, sickens, riots,
leaves, or dies"*. **Infection is a state on a building, never on a person**, and this brief draws it
at a threshold for exactly that reason.

---

## 9. The copy

**Register: results, not purchase.** Era six's exposure is through duration: *"three correct answers
buys a closure until the end"* is the sentence to avoid. **Answers earn; capacity is what is given
up.**

**Plainer language matters here more than in most**, because era six's mechanic is abstract. A
player who does not understand what a link is will not play well, and the copy is the only place
that can be explained.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Plague** |
| Entry announcement, heading | **Sickness in the town** |
| Entry announcement, body | It is moving between the places people go, and it has a head start on you. You can go when you are ready. |
| Entry announcement, control | **Go to the square** |
| Header | **{n} buildings affected** |
| Board label | The island. Routes between the places people use. |
| Network summary | 9 routes open, 2 suspended. **3 still run from an affected building to a clean one.** |
| Network summary, at zero | No route runs from an affected building to a clean one. This is nearly over. |
| Declare heading | **Choose what to shut** |
| Declare body | You can shut one route or every route into one building, and either way it opens again: what you are choosing is how long. Answer {n} questions, and the more you get right the longer it holds: one day at the bottom, and shut until this is over at the top. Then let the day pass and find out where the sickness went. |
| Commit control | **Shut it** |
| Advance control | **Let the day pass** |

**The declare body is deliberately not the sentence the other briefs use, and it must not be
normalised back into one.** Two reviews of this folder found eight of the nine briefs carrying one
template with the noun swapped: *"Pick a {thing}, then answer {n} questions. How many you get right
sets {outcome}."* That is the *"one encounter in the hand"* failure **D-CRISIS-19** exists to forbid,
and it lands hardest here, because era six is a crisis somebody will build. The rewrite says only
things that are true of era six and of nothing else in the folder: **the target can be an edge or a
node** (section 6.1), **the closure is temporary** (section 1), **duration is what accuracy sizes**
(section 4.2), and **the day passing is a separate decision the player makes** (section 4.4), which
is why the advance control is quoted in the body. It is longer than the sentence it replaces, and
section 9's own preamble is the licence: era six's mechanic is abstract and the copy is the only
place a link gets explained. The folder's README records the same defect in the six shelved briefs.

### 9.2 The cards

| Line | String |
| --- | --- |
| Suspend, name | **Suspend the route between the Printing House and the Fairground** |
| Suspend, body | Nobody uses it while it is shut. |
| Close, name | **Close the Fairground** |
| Close, body | Shuts every route into it at once. |
| Reopen, name | **Reopen the route to the Fairground** |
| Reopen, body | People use it again, and so can the sickness. |
| Cost zone, route | Happiness down 4 while it is shut |
| Cost zone, building | Happiness down 12 while it is shut |
| Ladder rung 1 | 1 right: shut for one day |
| Ladder rung 2 | 2 right: shut for two days |
| Ladder rung 3 | 3 right: shut until this is over |
| Unavailable, already shut | Already shut for two more days. |
| Unavailable, no headroom | Closing this would leave people without somewhere to go. |
| Armed | **Chosen** |
| Committed | Shutting. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **Suspending the Printing House route** |
| What it separates | This cuts the Printing House off from the Fairground and the three buildings past it. |
| What it costs | Happiness down 4 while it is shut. It comes back when this is over. |
| Progress | Two routes would be left from an affected building to a clean one. |
| Changes nothing | It still reaches the Fairground by the Merchant Houses. |
| Smallest first | With 1 right, it is shut for one day and then people use it again. |
| Middle | With 2 right, two days. |
| Best | With 3 right, it stays shut until this is over. |
| The bet | You can see what it cuts. You cannot see the score yet, and that is the choice. |

### 9.4 The question panel, and the solution

**Every answered question shows the solution, right or wrong.**

| Element | String |
| --- | --- |
| Heading | **Question {i} of {n}** |
| Verdict, correct | **Right** |
| Verdict, wrong | **Not this time** |
| Solution heading | **How this one works** |
| Solution body | (the item's own authored worked solution, unchanged) |
| Move on | **Next question** |
| Last question | **See how long it holds** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Three right | 3 right. The route is shut until this is over. |
| Two right | 2 right. The route is shut for two days. |
| One right | 1 right. The route is shut for one day. |
| None | 0 right. The order went out and it holds for today only. |
| Cycle resolved, spread | Overnight it reached the Merchant Houses and the Chapel. |
| Cycle resolved, contained | Overnight it went nowhere. |
| Closure expired | The Printing House route is open again. |
| Ended | **It is over.** Nothing is left to reach and the town can open up. |
| Ended, with the count | **It is over.** Five buildings were affected and all of them are back in use. |

**Note the last line.** Era six leaves no trace, so its ending copy can say so plainly, and it is the
only crisis of the nine that can.

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.** **Era six needs the DOM more than
any other crisis in this folder**, because its player verb acts on a thin diagonal target that a
keyboard cannot reach and a pointer struggles with.

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Link open | one inlay tone | Flush, continuous inlay, and it is listed in the link list |
| Link suspended | one tone | **Raised barrier stone across it**, recessed inlay either side, and **cut bands counting the days** |
| Link carrying the outbreak | one tone | **Cut notches along its length**, plus the network summary |
| Building infected | none | **Pedestal with a covered vessel at the threshold**, plus notched links, plus a status line |
| Building closed | none | **Shutter plates** (silhouette), **barred door panel**, status line |
| Building infected and closed | none | Both marks, separately readable |
| Closure duration | none | **Band count on the stone**, and a number in the DOM |
| Proposed closure | outline | **Outline of a stone, not a stone**, plus a lighter outline around the separated set |
| Card armed / unavailable / committed | border | Corner flag; reason text; diagonal hatch |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Link, in the rail's list | `Route between the Printing House and the Fairground. Open. The Printing House is affected.` |
| Link, suspended | `Route between the Printing House and the Fairground. Suspended for two more days.` |
| Building, clean | `The Fairground. Open, and not affected. Three routes run to it.` |
| Building, infected | `The Printing House. Affected. Two routes run from it to buildings that are not.` |
| Building, closed | `The Fairground. Closed. Its happiness is suspended while it is shut, and it comes back when this is over.` |
| Suspend card | `Suspend the route between the Printing House and the Fairground. Nobody uses it while it is shut. Happiness down 4. One correct answer shuts it for one day, two for two days, three until this is over.` |
| Network summary | `Nine routes open, two suspended. Three still run from an affected building to a clean one.` |
| Cycle resolution | `Overnight it reached the Merchant Houses and the Chapel.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **The network is the whole crisis and it is a picture on the floor.** The rail must carry a
  **complete link list** as buttons, each naming both ends and both states, and that list is the
  primary interaction path rather than a fallback.
- **What a closure separates** is a graph fact that is obvious visually and invisible otherwise. The
  read-out panel's separation line is required, not optional.
- **The cycle resolution happens all at once and silently.** It gets a polite live region naming
  every building that changed.
- **The terminal condition is a number.** *"Three still run from an affected building to a clean
  one"* is the sentence that tells a non-sighted player how close they are, and it must be in the
  header region.

---

## 11. The consolidated asset list

**22 items.** No entry is a bitmap. **Era six is the cheapest of the nine to build** and section 12
explains why.

### Atmosphere (6)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Plague lighting preset: nine numbers, key high and weak, hemisphere up | Treatment |
| A2 | Sky and fog preset: flat pale grey, clarity kept | Treatment |
| A3 | Raked, unwalked gravel walk treatment | Treatment |
| A4 | Stopped-survey dressing: plane table and rods standing, model under a cloth, plan unread | Geometry, from existing props |
| A5 | Boat standing off, holding position, with its posed still | Geometry + animation rig |
| A6 | Closed upper-storey shutters across the town, as general dressing | Geometry |

### The link layer (7)

| # | Item | Kind |
| --- | --- | --- |
| L1 | **Inlaid link band, flush, on the decal ladder. The crisis's central object** | Geometry |
| L2 | Link band, notched: carrying the outbreak | Geometry |
| L3 | Link band, recessed: suspended | Geometry |
| L4 | **Barrier stone, in three band counts (one, two, full collar)** | Geometry x3 |
| L5 | Expired barrier stone: no bands | Geometry |
| L6 | Link hover raise, both ends together | Treatment |
| L7 | Notch-travel interpolation for the cycle resolution, and its posed still | Animation rig |

### The buildings (4)

| # | Item | Kind |
| --- | --- | --- |
| B1 | Pedestal with a covered vessel: the infected marker | Geometry |
| B2 | Shutter plate, era six: painted timber shutters closed and barred | Geometry |
| B3 | Barred door panel with a single cut bar: the closure mark | Geometry |
| B4 | Proposed-closure outlines: stone outline, link outline, separated-set outline | Geometry |

### The UI (5)

| # | Item | Kind |
| --- | --- | --- |
| U1 | Action card design with a capacity cost zone, and its five states | DOM |
| U2 | Action glyphs: suspend, close, reopen, as one graph family | SVG x3 |
| U3 | **The link list**, as the accessible interaction path | DOM |
| U4 | Read-out panel: what it separates, what it costs, and the progress line | DOM + SVG |
| U5 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 13 geometry items or sets, 2 animation rigs, 3 SVG sets, 4 DOM designs, 3
treatments. **Build L1 and L4 first.** The inlaid band and the barrier stone are the crisis: with
those two the game is playable and everything else is refinement.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

**Era six has the shortest list of the nine, and that is the finding.** It wants nothing this
renderer cannot do, which makes it the safest crisis to build first and a good candidate for proving
the link layer that era seven then inherits.

1. **Lead domes that read as lead.** No environment map, `metalness: 0` by convention. Era six's
   accent is pale, faceted and flat, which is already how the era's buildings are authored, so this
   is a limitation the era has already absorbed rather than one the crisis introduces.
2. **People, or their absence made visible.** The most powerful image available to a plague crisis is
   a square that used to be full and is now empty, and **the square was never full**: there are no
   crowd agents in the renderer and the citizens system is a derived readout rather than posed
   figures. **The brief works around this with stopped work and raked gravel**, and it is a genuine
   loss.
3. **A link that visibly carries traffic when open.** Moving dots along the bands would say what a
   link is far better than any legend. It is buildable and it is **ruled out on simplicity
   grounds**: the constraint says nothing may ask the player to reason about how much traffic a link
   carries, and moving dots imply exactly that.
4. **Link bands routed around buildings.** The bands run building to building across the paving; where
   a third building stands between two linked ones, the band has to go somewhere. **Routing a line
   between two anchors without occluding either is real work** and it is listed in the crisis spec
   as part of what the shared edge primitive costs.
5. **A per-cell ground layer at era six's radius.** Not wanted: era six lays no per-cell layer. **The
   link bands must still clip to the drawn island**, since era six's authored radius of 51 is well
   past the drawn grass at 30.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **Does the Plague leave any residue?** Carried in the crisis spec as **O-10**. It is the only crisis of the ten that leaves no trace, and whether that is intended is not ruled. | Team lead | It decides whether the exit in section 2.7 is a full restoration or leaves something on the island, which is a visible difference and a real asset |
| **Q2** | **Are some links unknown until used?** The other half of O-10. Section 3.3 draws every link from the first turn, which is the reading that reconciles *"visible"* with *"partly hidden"*. | Team lead | It would change the link layer substantially: an undiscovered link needs a state, a reveal, and a place in the link list |
| **Q3** | **Does accuracy size duration or permission?** The cadence says *"permission or duration"* and does not choose. Section 4.2 draws duration, because it is the reading under which era six's own question has an answer. | Team lead | It is the ladder, the barrier stone's band count, and every result line |
| **Q4** | **What happens when a needed closure exceeds the available headroom?** Carried as **O-9**, and widened by D-CRISIS-11 into a boundedness question as well as a winnability one. | Era progression owner, with the citizens owner | A refused closure needs a card state and a copy line, and section 6 does not have one |
| **Q5** | **How many links per building, and where do they come from?** The constraint is *"a few visible links"* per active public building, authored from who visits where. Nothing says how many. | Whoever authors era six's content | It decides whether the board is readable. Four buildings with two links each is a puzzle; twelve with six each is a hairball |
| **Q6** | **Does a closed building stop spreading, or only stop receiving?** Section 4.3 draws closing a building as closing all of its links, which makes it symmetric. | Team lead | It changes what the read-out panel's separation line says, which is the panel's most important line |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-8 (the spread-through-use
  ruling, the three topologies, and the simplicity constraint), sections 5.9 (the shared edge
  primitive and the valence warning), 5.10 (the floor check and the era-two comparison), D-CRISIS-11
  (the terminal condition, and closures shortening the crisis), D-CRISIS-20 (immediate against
  batched), and INV-CRISIS-1, 3, 4, 5, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, shutter plate, copy
  rules and per-era decal reach
- `docs/superpowers/specs/eras/era-06-early-modern/style-guide.md`: the drawing made physical, the
  geometric paving, and the props kit including the inlaid meridian line and the bench mark
- `apps/web/src/city/three/WinterGround.tsx`: the decal ladder the link bands sit on
- `engines/game/src/citizens.ts` and `citizens-roster-invariants.test.ts`: the compiled guard that
  makes a `sick` citizen state impossible, which is why infection is a state on a building
- `packages/economy/src/capacity.ts`: `deriveCapacities` and INV-COS-1's *"a shortfall gates
  nothing"*
- `engines/game/src/crisis-damage.ts`: `suspended_civic`
- #298: era six's buildable radius of 51
- #302: era one's brief
