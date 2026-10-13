# The Great Fire: design and asset brief

**Era:** 5, Medieval
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era five's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

**This is the hardest of the nine to render**, and section 4 says so plainly rather than working
around it.

---

## 0. The hard boundary

**Read `./README.md` first.** Era five collides with it harder than any other crisis:

1. **A fire cannot glow.** No `pointLight`, no `spotLight`, no bloom, no spill from emissive. A
   burning building cannot light the building next to it, cannot put a warm pool on the street, and
   cannot tint anything. **Era one's fire already reads badly and this is why.**
2. **Nothing tints a building at runtime.** A building cannot be drawn as burning by making it
   darker or oranger. Every burning state is **new geometry**, and section 4.3 specifies the seam it
   goes through.
3. **No image textures.** No char texture, no soot map, no scorch decal. Charring is geometry and
   material colour.
4. **No post-processing.** `@react-three/postprocessing` is not a dependency, so bloom on a flame
   tip is a package decision.

**One important thing this crisis CAN have, and it is the best news in the brief.** See section 2.1:
**the one kind of firelight this renderer can draw is global firelight**, and a city-wide fire is
the one situation where global is physically correct.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading;
**emissive as a bright face up to about 1.35, which is shipped precedent**; `useFrame` animation
gated on `prefers-reduced-motion`; several hundred small meshes or one `InstancedMesh`; the shared
ground-decal ladder; the stage-swap seam in `PlacedBuilding` that already carries `site`,
`construction`, `built` and `ruined`; and the nine lighting numbers plus sky and fog.

---

## 1. The crisis, and what the player does

**The premise, in one line.** A fire has taken hold in a town of oak frames and thatch, and the only
thing that stops it is a gap.

**The ritual: I choose irreversible sacrifices.** Era five is the only crisis of the ten where **the
cost of the answer is your own buildings**. Every other crisis spends a resource, an action or a
turn. This one spends the settlement.

**The cadence: answer to earn permission, then accept a cost.** Shared with era six, and eras five
and six are **adjacent**, which the crisis spec calls the worst placement a shared cadence could
have. Section 1.1 covers what holds them apart.

**Duration: supply exhaustion.** It ends when **no burning building has an unburnt neighbour**.

**Spread: strictly tile adjacency.** Building to touching building, and **never along a route or a
link**. This is ruled and it is the single most important thing to protect about era five: giving
the fire a link layer would put it on era six's and era seven's structure and leave era five with
nothing of its own but the sacrifice axis.

**Entry.** After `ceil(n / 2)` of era five's five nodes (`RAT.1`, `RAT.2`, `RAT.3`, `RAT.4`,
`RAT.6`), which is **three**.

### 1.1 Era five against era six, in the hand

They share a cadence and they are next door to each other. **Three axes hold them apart** and the
third is the one the player feels every turn:

| | Era five | Era six |
| --- | --- | --- |
| What the spread follows | **Tile adjacency.** Things that touch | **Human movement.** Links between buildings people use, which need not touch |
| What the player sacrifices | **Structures**, permanently damaged, paid for in materials | **Access and capacity**, temporarily, destroying nothing |
| **How consequences resolve** | **Immediately.** The building comes down before the fire's next step | **At the end of a cycle.** You close a link and then find out where it had already gone |

**The immediacy is a presentation requirement, not a flavour note.** A demolition that resolved at
the end of a cycle would collapse the third axis silently, and it would look like a consistency
improvement to whoever did it. **Section 4.4 specifies the beat.**

### 1.2 The compact-board warning, which is era five's alone

The crisis spec measures the live city at **seven buildings across three rim bands**, tighter than
the `packed` test fixture, and names the Great Fire as the sharper of the two crises this hurts.
**On a board that small a firebreak may have to take out a large fraction of the settlement to be a
break at all**, and the demolition is permanent.

**This is not a presentation problem and presentation cannot fix it**, but it changes what the
surface owes the player: **the read-out panel has to be brutally clear about how much of the town a
break costs**, because on a compact board the honest answer is "a lot". Section 7 is written to
that.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the town is burning. This is
the easiest of the nine to satisfy and the easiest to overdo.

**The constraint:** era five's floor in the ground ladder is **era four's floor, failing**: slabs
sunk, tilted and rocking, ruts worn along the routes, patches let in, new ground cobbled in rough
fans, beaten earth with a central gutter. **None of that changes.**

### 2.1 The light, and the one piece of good news in this brief

**The one kind of firelight this renderer can draw is global firelight, and a city-wide fire is the
one situation where global is correct.**

`lightSpec()`'s `hemiGround` is documented in `CityLighting.tsx` as *"the light bouncing back up off
the ground, so it has to be the colour the ground actually is"*. **Under a great fire the bounce
genuinely is firelit.** Setting `hemiGround` to a deep ember and raising the hemisphere's intensity
lights **every building in the town warm from below**, across the whole island, for the cost of two
numbers. It is not a pool of light and it is not a glow, and it is the closest this renderer will
ever get to a city lit by its own fire.

| Lever | Era five's day preset today | Great Fire direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Grey and weak.** The sun is behind smoke |
| Key intensity | 1.32 | **Well down.** Hard sunlight and a burning town cannot both be true |
| Key angle | Low and raking | Flatter. Under heavy smoke there is barely a direction |
| Hemisphere sky | `#CFE6F6` | **Brown-grey.** Smoke overhead, not sky |
| Hemisphere ground | `#C08F57` warm earth | **A deep ember orange, and this is the single most valuable number in this brief.** It is the whole town lit from below by its own fire, and it is one table entry |
| Hemisphere intensity | 0.95 | **Up.** Under smoke most of the light in the world is bounce, and here the bounce is the fire |
| Ambient | `#F5EFE2` at 0.30 | Warm and low |
| Rim | `#BFDCEF` at 0.48 | **Keep it cool.** A cool rim against a warm bounce is what stops the whole island going one flat orange, and separation matters more here, not less |
| Background (sky) | `#BFE1F2` clear blue | **A dirty warm grey.** No blue at all |
| Fog colour | `#D6ECF7` | Match the smoke |
| Fog near and far | `radius x 3` to `radius x 20` | **Pull both in hard.** Smoke haze is the cheapest and most convincing thing in this section |

**The trap: do not let the whole island go orange.** A monochrome scene loses the board, and the
player is making a spatial decision on it. **The cool rim and the grey key are what hold the picture
apart**, and the ember bounce should be judged against them in a render rather than chosen alone.

### 2.2 Ground

Two courses on the shared decal ladder:

- **Ash fall**, across the whole settlement, thickening toward the fire. A pale grey course laid
  over era five's failing paving, thin enough that the sunk slabs and the cobbled fans read
  through it. **This is what makes the fire feel like it is affecting the town rather than a few
  buildings.**
- **Burnt ground**, on the cells a burnt building stood on: char, cracked, with the cobbles heat-
  spalled. It uses the shipped scarred-ground tone `0x4A4844`, which is already the dead char the
  winter's abandoned ground carries, so era five inherits the vocabulary rather than inventing one.

**The reach question.** Under #298 era
five's buildable radius is **47** against a drawn grass radius of **30**, so the buildable disc is
well outside the drawn island. **The ash course must clip to the drawn island**, and #298's own test
records that the island art has not grown to match. Flagged in section 12.

### 2.3 Vegetation

Era five's planting is incidental: a kitchen garden, a beehive, a woodpile under a lean-to. **The
crisis changes what has been done with it, not what grows:**

- **The woodpile has been pulled apart and carried away**, which is the most sensible thing a town
  full of oak frames does when a fire starts. Two or three scattered billets left.
- **The drying nets are down.**
- **Nothing scorches and nothing wilts.** A fire that has taken the gardens is a different and
  larger fire than this one.

### 2.4 Water and shoreline

Era five's shoreline is **defended and crowded**, and the crisis's use of the water is practical
rather than atmospheric:

- **The well-head and the horse trough are in use**, buckets out, the windlass rope run out. Era
  five's props kit has both. **This is the town's answer to the fire and it is deliberately
  inadequate**, which is why the player's answer is a gap and not a bucket.
- **Ash on the water**, as a thin pale course on the lagoon's surface near the shore, fading out.
  Vertex colour on the existing sea geometry rather than a new mesh.
- **The water does not glow and does not carry a reflection.** No environment map.

### 2.5 Signs of habitation at the margins

**A town that has grabbed what it could carry**, from era five's own kit:

- **Barrels and corded sacks pulled into the open**, away from the frontages, in heaps rather than
  in rows.
- **The iron-banded chest out in the street**, which is what people save first.
- **The chalked slate tally board part-wiped**, hanging askew. The era's own tally prop, and it
  reads as a business abandoned mid-sentence.
- **The market cross is where everything has been carried to.** Era five's kit has it with an open
  shelter round it, and it is the town's own gathering point. **Piling the town's goods at the cross
  is the cheapest way to say the town is acting together.**
- **The treadwheel crane under its shingled hood stands idle**, its hood being the one thing in the
  town nobody wants near a fire.

### 2.6 Does anything move

**Yes, and the smoke is the most important moving thing in any of the nine briefs.**

- **Smoke columns**, one per burning building, tall, leaning on the island's wind vector. **This is
  the highest-value single item in this document**, for the reason era one's brief gives: a fire
  three units tall vanishes behind any building, and a smoke column twenty units tall never does.
  **The board reads from smoke at any pan or zoom.**
- **Flame flicker**, subtle and irregular, on the frame loop. Flame is the one shape in the world
  defined by movement.
- **Embers rising with the smoke**, as small bright meshes. Cheap once the smoke rig exists.
- **Ash falling**, sparse, slow and drifting on the wind vector. Different from era one's snow in
  colour and in scale, and the same rig.
- **Every animation is gated on `prefers-reduced-motion`** and holds a posed still.
- **Nothing that moves may advance the encounter.** The fire spreads because a turn ended, not
  because a flame animation looped.

### 2.7 The transition, in and out

**In:** the lighting numbers with the ember bounce, the smoke sky, the fog pulled in, the ash
course, the first building's burning stage, its smoke column.

**What never changes:** the buildings that are not burning, the paving, the island's geometry, the
shoreline.

**Out, and era five's exit is unlike any other because the damage is the point.** When the fire runs
out of neighbours the smoke thins and the light comes back over several beats, and **what is left is
a hole in the town**: ruins where buildings were demolished, ruins where buildings burnt, burnt
ground under both. **The exit must not tidy up.** A player who walks out of era five's crisis into a
clean town has not had the experience the crisis exists to deliver.

### 2.8 The read, in one sentence

*The same crowded town under its own smoke, lit orange from underneath, with a gap pulled through
the middle of it and the goods piled at the market cross.*

---

## 3. The hazard

### 3.1 The three questions the board must answer

1. **What is burning now?**
2. **What catches next?** Tile adjacency, so the answer is "what touches what is burning". **This
   must be visible before it happens** or the player cannot choose a break.
3. **What is already gone?** Burnt buildings stay on the board as ruins and they are not fuel any
   more, which is what makes the fire eventually stop.

### 3.2 The four building states

**All four are stage swaps through the seam `PlacedBuilding` already has.** `ruinStage.ts` is a
footprint-keyed cached template selected as a `PlacedModelStack` layer kind, and going into a state
and coming out of it cross-fade through the same `FadeLayer` a stage change uses. **Adding
`burning` and `burnt` is the same shape of work as `ruined` was**, and nothing outside that file
needs to change.

| State | What is drawn | Channels |
| --- | --- | --- |
| **Standing** | The building as authored | (none) |
| **At risk** | Standing, plus a **ridge marker**: a short run of raised crest along the roof ridge, on the elevation facing the fire | Silhouette change on the ridge, plus the ridge marker's own tone |
| **Burning** | **Roof stage swap:** tiles slipped and gapped, rafters exposed, a hole in the roof plane with **flame geometry standing out of it**, plus a **smoke column** | Silhouette change (a holed roof reads at any zoom), flame geometry, smoke column, ember motion |
| **Burnt** | **Ruin stage:** silhouette collapsed, the frame's charred posts standing, daub panels fallen out at the foot | Silhouette collapse, burnt ground under it |

**Why the roof.** Era five's guide says the roof plane *"is a face in its own right under the
three-tone model rather than a cap"* and that on smaller buildings it covers more of the elevation
than the wall does. **The roof is therefore the largest and most visible surface era five has**, and
a holed roof is the clearest possible "this one is burning" at the zoom the game holds.

### 3.3 The adjacency read, which is the axis

**The player must be able to see what touches what.** On a compact board that is not obvious, and it
is the whole decision.

- **A burning building's touching neighbours carry the ridge marker.** That is the "catches next"
  set, drawn on the buildings themselves.
- **The ground between two touching buildings carries a short adjacency run** on the decal ladder: a
  low line of heat-spalled cobbles from one footprint to the other. **Only between buildings that
  actually touch**, which is what makes the topology legible.
- **Nothing is drawn between buildings that do not touch**, however close they look. **This is the
  rule that keeps the Great Fire off era six's structure**, and it is the one an implementer is most
  likely to soften.

### 3.4 The flame, honestly

**A flame that lights nothing is a real design problem and this brief does not pretend otherwise.**
The levers that remain, in order of value:

1. **Smoke.** Unconstrained, tall, visible from everywhere. Build this first.
2. **The holed roof.** A silhouette change the size of a roof plane, which reads further than any
   flame will.
3. **Motion.** An irregular flicker rig.
4. **Emissive on the flame mesh**, at up to about 1.35, which is shipped precedent on the mastery
   stars. It will not spill and at the base of a dark smoke column against a grey sky it will still
   read as the hottest thing in the picture.
5. **The global ember bounce**, section 2.1.
6. **Embers.**

**One guard to author correctly the first time.** Era one's `winterGround.test.ts` asserts emissive
is exactly zero on every material in the winter layer, which is right about ground and wrong about
flame, and era one now has to loosen it. **Era five has no such guard yet.** Write era five's the
way era one's should have been: **emissive permitted on flame meshes, forbidden on ground**, with
the ground half proved by injecting an emissive ground tile and watching it fail.

---

## 4. The player's own mark

**The gap.** Era five's player does not fight the fire. They pull a building down so the fire has
nowhere to go.

### 4.1 The firebreak is era one's `abandon`, aimed at a building

The crisis spec is explicit: a demolished building **must become a repairable ruin, not a removal**,
and that is not a new mechanic. Era one's `abandon` already sets `state: "ruin"` with
`ruined_by: "abandoned"`, the building stays on the board carrying its lesson, and
`rebuild_cost_per_ruin` is reported against it. **The Great Fire's firebreak is that, aimed at a
chosen building rather than at the next ring inward.**

**For an artist that means the demolished state and the burnt state are the same ruin family**, and
they need to be **distinguishable**:

| | Burnt | Demolished |
| --- | --- | --- |
| Silhouette | Collapsed, **frame posts standing**, charred | Collapsed, **frame posts pulled down and stacked** |
| Ground | Burnt ground, heat-spalled | **Clean rubble**, not charred |
| Second channel | Ash on everything nearby | **A hook and rope left at the foot**, which is how a medieval town pulled a house down |

**They must differ**, because one is what the fire did and the other is what the player did, and the
player is entitled to see the difference between the two afterwards.

### 4.2 The three rungs

Accuracy sizes the action and never decides whether it happens. **Era five's cadence is "answer to
earn permission, then accept a cost"**, so what the batch sizes is **how much of the break the town
manages to pull down in time**:

| Rung | What comes down | On the board |
| --- | --- | --- |
| **1 right** | **A partial pull-down.** The roof comes off and the frame stays | The building is a **half-ruin**: no roof, posts standing. **It is still fuel**, so the break is not a break |
| **2 right** | **The building comes down** | Full demolished ruin, and the gap is a gap |
| **3 right** | **The building and its outbuildings come down** | The demolished ruin plus the props at its foot cleared, widening the break by the cell the lean-to occupied |

**The bottom rung still acts.** A roof off and a frame standing is era five's version of era one's
fire that wards nothing: the town tried, the decision is on the board, and it did not achieve the
break.

**Whether the rungs are exactly this is [Q1](#13-open-questions)**, because the spec rules the
cadence and not what scales.

### 4.3 The demolition, drawn

**This is the crisis's signature moment and it deserves the animation budget.**

- The building's stage swaps from `built` to `demolished` through the same cross-fade every stage
  change uses.
- **A single dust burst** at the foot: a short-lived cloud of small meshes, posed on the frame loop.
- **The frame posts fall outward and stack**, as part of the demolished template rather than as a
  simulation.
- **Under `prefers-reduced-motion` the stage swaps and the dust is a single posed still.**

### 4.4 The beat, which is a hard requirement

**The building comes down BEFORE the fire's next step, in the same beat as the decision.** The
crisis spec's own words: the Great Fire's chosen building *"collapses before the next spread step"*,
against era six's infections travelling *"at the end of a cycle"*. **That immediacy is the third
axis separating the two adjacent crises**, and a design that queued the demolition to resolve with
everything else would erase it while looking like a tidy-up.

**Concretely:** commit, demolition plays, the board settles, and only then does the fire advance on
the player's own advance control. **Two beats, in that order, always.**

---

## 5. The crisis surface

### 5.1 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.** The fire is inside the settlement
rather than at the rim, so the argument for a right rail is slightly weaker here than in era one and
it still holds: a centred panel would cover the middle of the town, which is exactly where the
decision is.

Rail order:

1. **Header**: the crisis name, and **what is burning**, as a count. **Not a progress bar.**
2. **The catches-next line**: which buildings take the fire on the next step, by name.
3. **The action cards.**
4. **The read-out panel** when a demolition is armed.
5. **The commit control.**

### 5.2 At 460

Single column, **board first**, cropped tight on the fire and its neighbours. **The crop follows the
fire.** A player at 460 who cannot see what is burning cannot play.

**The catches-next line never collapses**, and at 460 it moves above the board rather than below it,
because it is the one piece of information the crop might cut off.

### 5.3 The hierarchy

**The smoke columns are the subject.** They are the tallest thing in the frame, they are the only
warm thing, and they answer "where is this happening" from any camera position. Everything else on
the screen is a caption on them.

---

## 6. The option cards

### 6.1 The actions

| Action | Kind of answer | Glyph |
| --- | --- | --- |
| **Pull a building down** | **The sacrifice answer.** The crisis's whole axis | A house with its roof coming off |
| **Wet the thatch** | The delay answer: a building holds one more step before it catches | A bucket over a roof line |
| **Clear the goods** | The salvage answer: what would be lost is carried to the cross instead | Bales moving toward a cross |

**The second and third are not ruled** and are [Q2](#13-open-questions). One verb makes for a thin
crisis; three makes the sacrifice a choice among options rather than the only move, which is what
the axis wants.

### 6.2 The card

428 units wide, about 104 tall, carrying a cost zone like era four's.

- **A 40 unit action glyph** on the left.
- **The action name** at 16 units, **the target building** at 14, a one-line statement at 13.
- **A cost zone**, structurally separate, and for the demolition card it carries **the rebuild
  price**. This is the era-one lesson applied where it matters most: **the only card in this crisis
  with a permanent price must not look like the two that do not.**

### 6.3 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2, card lifts 1, **no colour change**, and **the target building's footprint raises on the board** |
| **Armed** | 3-unit border, corner flag with a check glyph, **Chosen** top right, `aria-pressed="true"` |
| **Unavailable** | **The reason replaces the ladder**: *"Nothing here touches the fire."* `disabled`, `aria-describedby` |
| **Committed** | 6-unit diagonal hatch, declared line replacing the body |

### 6.4 The confirmation, which era five needs and the others do not

**Pulling down your own building is the only irreversible destructive act in the whole game.** It
warrants a confirmation step, and the confirmation must not be a modal that reads as an error.

**The recommendation:** the commit control for a demolition is a **two-stage control in the card
itself**. The first press arms it and the label changes to name the consequence:

> **Pull down the Weaver's Shop** becomes **Yes, pull it down. {n} material to rebuild.**

Two presses, one control, no dialog, and the consequence is written on the control the player is
pressing. **Nothing else in the crisis gets this**, so the weight lands where the design wants it.

---

## 7. The read-out panel

### 7.1 What it is for

The player has armed a demolition. **The question is "is this gap worth this building?"** and it is
the only question era five asks.

### 7.2 The direction

- **Lead with what the gap saves**, by name. The buildings on the far side of the break are the
  whole reason for it.
- **Then what it costs**, by name and by rebuild price. **On the compact board this number will be
  large relative to the town**, and section 1.2 says the panel must not soften it.
- **Show the break as a plan**, a small diagram of the footprints with the demolished one hollow and
  the protected ones marked. The board already draws this figure and the panel is a second view of
  it.
- **Say when the break does not break.** If the fire has another path around it, that is a finding
  about the player's choice: *"The fire still reaches the Guild Hall by the north side."* **This is
  the single most valuable line the panel can carry** and it is the one a player will be furious to
  learn afterwards.
- **No dashed borders.**

### 7.3 The provisional register

**Provisional states are outlines, never fills.** A proposed demolition is drawn on the board as a
**raised outline around the building's footprint** with a numeric badge giving the number of correct
answers that reaches each rung. The buildings it would protect carry a **second, lighter outline**.
A committed demolition is a stage swap. The two can never be confused.

---

## 8. Damage and consequence

**Era five carries more persistent damage out of its crisis than any other of the nine**, and that
is the design working rather than failing.

### 8.1 The three end states

| End state | What it is | What it costs |
| --- | --- | --- |
| **Burnt** | The fire reached it | A ruin, repairable at `rebuild_cost_per_ruin` |
| **Demolished** | The player pulled it down | A ruin, repairable at the same price, and **visually distinct** per section 4.1 |
| **Half pulled down** | The bottom rung acted and did not finish | **Roofless, frame standing.** Repairable, and cheaper than a full ruin if the mechanic distinguishes them, which is [Q3](#13-open-questions) |

**All three are ruins, and all three are click targets carrying their lessons.** Nothing here is
removed. `crisis-damage.ts` has no field that could record a removal.

### 8.2 Burnt ground

Cells under a burnt or demolished building carry **burnt ground**, using `ScarredGround`'s shipped
slab on the island's `worn` rung in the dead char tone `0x4A4844`. It is durable, unbuildable and
un-roadable until reclaimed at the authored price. **Era five inherits this whole mechanism and adds
nothing to it** except heat-spalling on the cobbles, which is a geometry variant.

### 8.3 Repair, and what the town looks like half repaired

**Era five is the crisis most likely to be played through with damage standing**, because the bill
is large and the material is era-specific. So the **partly repaired** state matters more here than
anywhere:

- A repaired building cross-fades from the ruin stage back to the stage it was at. Shipped
  behaviour, no new asset.
- **Reclaimed ground loses its char slab** and returns to era five's failing paving.
- **A town with three ruins and two rebuilt buildings should read as a town rebuilding**, not as a
  town with bugs in it. **The ordering is worth authoring:** ground reclaimed first reads as
  clearing up, buildings raised first reads as ignoring the mess.

### 8.4 The floor

Nothing is removed, no node is relocked, no mastery is touched. The crisis spec calls era five *"the
one closest to the line"* and answers it: a demolished building **must become a repairable ruin, not
a removal**, and that framing must be written into the design rather than left to an implementer.
**It is written here, in section 4.1, and it is the reason the demolished template exists as a
template rather than as a deletion.**

---

## 9. The copy

**Register: results, not purchase.** Era five's exposure is different from era four's: this crisis
has a genuine, large, material price, so **cost language is correct about the rebuild bill and wrong
about the answers**.

- **Right:** *"40 material to rebuild."* The bill is real.
- **Wrong:** *"Three correct answers buys the full pull-down."*
- **Right:** *"3 right. The whole building came down."*

**Do not narrate the loss back at the player.** Era five will tempt a writer into elegy. The
building came down, here is what it saved, here is what it costs to raise again.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Great Fire** |
| Entry announcement, heading | **Fire in the town** |
| Entry announcement, body | It started in the workshop row and it is moving building to building. You can go when you are ready. |
| Entry announcement, control | **Go into the town** |
| Header | **{n} buildings alight** |
| Board label | The island. Choose a building to pull down. |
| Catches next | **Next it takes the Wool Store and the Timber Houses.** |
| Catches next, none | Nothing else is touching the fire. |
| Declare heading | **Choose what comes down** |
| Declare body | Pick a building, then answer {n} questions. How many you get right sets how much of it the town gets down in time. |
| Commit control | **Pull it down** |
| Commit, second stage | **Yes, pull it down. {n} material to rebuild.** |

### 9.2 The cards

| Line | String |
| --- | --- |
| Pull down, name | **Pull down the {building}** |
| Pull down, body | Makes a gap the fire cannot cross. |
| Pull down, cost | {n} material to rebuild afterwards |
| Wet the thatch, name | **Wet the thatch on the {building}** |
| Wet the thatch, body | It holds one more turn before it catches. |
| Clear the goods, name | **Clear the {building}** |
| Clear the goods, body | Carries what is inside to the market cross. The building still burns. |
| Ladder rung 1 | 1 right: the roof comes off and the frame stays |
| Ladder rung 2 | 2 right: the whole building comes down |
| Ladder rung 3 | 3 right: the building and its outbuildings |
| Unavailable | Nothing here touches the fire. |
| Armed | **Chosen** |
| Committed | Coming down. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **Pulling down the Weaver's Shop** |
| What it saves | This stops the fire reaching the Guild Hall and the Tower House. |
| What it costs | The Weaver's Shop is a ruin afterwards. 40 material to rebuild. |
| Does not break | The fire still reaches the Guild Hall by the north side. This gap does not close it. |
| Smallest first | With 1 right, the roof comes off and the frame stays. The frame still burns. |
| Middle | With 2 right, the building comes down and the gap holds. |
| Best | With 3 right, the building and its outbuildings come down. |
| The bet | You can see the gap. You cannot see the score yet, and that is the choice. |

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
| Last question | **See what came down** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Full | 3 right. The building and its outbuildings came down. The gap is clear. |
| Standard | 2 right. The building came down. The gap holds. |
| Partial | 1 right. The roof came off and the frame is still standing. It will still burn. |
| None | 0 right. They got the roof started and no further. |
| Spread | The fire has taken the Wool Store. |
| Stopped at the gap | The fire reached the gap and stopped. |
| Ended | **The fire is out.** It ran out of anything to take. |
| Ended with damage | **The fire is out.** Four buildings are ruins and the ground under them needs clearing. |
| Repair available | The {building} can be rebuilt for {n} material. |

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.**

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Building at risk | none | **Ridge marker** (silhouette), and the catches-next line names it |
| Building burning | flame tone | **Holed roof** (silhouette), **smoke column**, ember motion, status line |
| Building burnt | none | **Silhouette collapse with frame posts standing**, burnt ground, status line |
| Building demolished | none | **Silhouette collapse with posts stacked**, clean rubble, hook and rope, status line |
| Building half down | none | **Roofless with frame standing**, status line |
| Adjacency between two buildings | one tone | **A raised run of heat-spalled cobbles**, and the catches-next line |
| Proposed demolition | outline | **Raised outline, not a fill**, plus a numeric badge, plus the read-out panel |
| Protected by a proposed break | outline | **A second, lighter outline**, and named in the panel |
| Burnt ground | one tone | Slab relief on the `worn` rung, and it blocks building, which is announced |
| Card armed / unavailable / committed | border | Corner flag; reason text; diagonal hatch |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Building, standing | `The Guild Hall. Standing. It touches the Weaver's Shop, which is alight.` |
| Building, at risk | `The Wool Store. Standing, and it takes the fire next.` |
| Building, burning | `The Weaver's Shop. Alight.` |
| Building, burnt | `The Weaver's Shop. Burnt out. It can be rebuilt for 40 material.` |
| Building, demolished | `The Weaver's Shop. Pulled down to make a gap. It can be rebuilt for 40 material.` |
| Building, half down | `The Weaver's Shop. Roof off, frame standing. It will still take the fire.` |
| Demolition card | `Pull down the Weaver's Shop. Makes a gap the fire cannot cross. 40 material to rebuild afterwards. One correct answer takes the roof off, two brings the building down, three takes its outbuildings too.` |
| Confirmation | `Yes, pull it down. 40 material to rebuild.` |
| Catches-next line | `Next it takes the Wool Store and the Timber Houses.` |
| Burnt ground | `Burnt ground. Nothing can be built here until it is cleared.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **Adjacency is the axis and it is carried by a low run of cobbles on the ground.** Every
  building's accessible name must end with what it touches, or a non-sighted player cannot reason
  about the fire at all. **This is the single most important accessibility requirement in this
  brief.**
- **Smoke says where the fire is** and is silent. The header count and the catches-next line carry
  it.
- **The immediacy of the demolition** is a visual beat. It gets an assertive live region, because
  the board changed as a direct result of the player's action: *"The Weaver's Shop is down."*
- **A break that does not break** must be spoken before commitment, not after.

---

## 11. The consolidated asset list

**28 items.** No entry is a bitmap.

### Atmosphere (8)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Great Fire lighting preset, **including the ember `hemiGround`**, which is the single highest-value number here | Treatment |
| A2 | Sky and fog preset: dirty warm grey, fog pulled in hard | Treatment |
| A3 | Ash-fall ground course, thickening toward the fire, clipped to the drawn island | Geometry, tiling set |
| A4 | Falling ash field, with a posed reduced-motion still | Geometry + animation rig |
| A5 | Ash on the water: vertex colour on the existing sea geometry | Material |
| A6 | Town-braced dressing: goods piled at the market cross, chest in the street, woodpile pulled apart, nets down | Geometry, from existing props |
| A7 | Well and trough in use: buckets out, windlass rope run | Geometry, from existing props |
| A8 | Island clip for the ground layer, so cells past radius 30 are not drawn | Treatment |

### The fire (7)

| # | Item | Kind |
| --- | --- | --- |
| F1 | **Smoke column, leaning on the wind vector. Highest-value single item in this brief** | Geometry + animation rig |
| F2 | Flame geometry standing out of a holed roof, plus its flicker rig and posed still | Geometry + animation rig |
| F3 | Embers | Geometry + animation rig |
| F4 | Burning roof stage: tiles slipped and gapped, rafters exposed, a hole in the plane | Geometry, per footprint |
| F5 | Ridge marker for the at-risk state | Geometry |
| F6 | Adjacency run: heat-spalled cobbles between two touching footprints | Geometry |
| F7 | Emissive policy and its guard: permitted on flame, forbidden on ground, with the ground half proved by injection | Treatment |

### The buildings (6)

| # | Item | Kind |
| --- | --- | --- |
| B1 | Burnt ruin template: collapsed, frame posts standing, charred | Geometry, per footprint |
| B2 | Demolished ruin template: collapsed, posts pulled down and stacked, clean rubble | Geometry, per footprint |
| B3 | Half-down template: roofless, frame standing | Geometry, per footprint |
| B4 | Hook and rope prop at a demolished building's foot | Geometry |
| B5 | Demolition dust burst, and its posed still | Geometry + animation rig |
| B6 | Burnt-ground slab variant: heat-spalled cobbles on the shipped scar tone | Geometry |

### The UI (7)

| # | Item | Kind |
| --- | --- | --- |
| U1 | Action card design with a separate cost zone, and its five states | DOM |
| U2 | **The two-stage demolition confirmation control** | DOM |
| U3 | Action glyphs: pull down, wet the thatch, clear the goods | SVG x3 |
| U4 | Read-out panel: what it saves, what it costs, and the does-not-break line | DOM |
| U5 | Firebreak plan diagram: footprints, the hollow one, the protected ones | SVG |
| U6 | Proposed-demolition outline and the lighter protected outline | Geometry |
| U7 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 17 geometry items or sets, 5 animation rigs, 4 SVG sets, 4 DOM designs, 4
treatments, 1 material. **Build A1 and F1 first**, in that order. A1 is two numbers and it lights the
whole town with its own fire; F1 is the only thing that makes a fire visible from anywhere on the
board.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

1. **A fire that lights the buildings around it.** The largest gap between what this crisis wants and
   what it can have. Needs a `pointLight` per fire, in a rig that has four global lights, and a
   second shadow map if it is to cast. **The global ember bounce in section 2.1 is the substitute
   and it is a good one**, but it lights the whole island equally, so a town with one building
   alight is lit as brightly as a town with six.
2. **Bloom on the flame.** `@react-three/postprocessing` is not a dependency. Adding it is a
   rendering-architecture decision affecting every surface in the game.
3. **Scorch marks creeping up a wall as a building heats.** No image textures and no decal
   projection. Charring is geometry, so a progressive char would be several templates per footprint
   rather than one.
4. **Heat shimmer over the fire.** Needs a post-processing distortion pass. Not available.
5. **Firelight on the water.** No environment map, nothing to reflect. The ash course on the lagoon
   is the substitute.
6. **A per-cell ash course at era five's authored radius, drawn today.** Under #298 the buildable
   radius is 47 against a drawn grass radius of 30, so **432 cells of ash would extend well past the
   island onto nothing.** A8 exists in the asset list for this reason.
7. **Smoke that occludes the board.** Buildable, and deliberately not wanted: the player is making a
   spatial decision on the board and smoke that hides it makes the crisis unplayable. Smoke should
   be tall and thin rather than broad, which is also what makes it read from the fixed camera.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **What does accuracy size in era five?** Section 4.2 is drawn on "how much of the building the town gets down in time", which gives the bottom rung a visible and useless outcome. The alternative is that accuracy sizes how many buildings may be pulled down this turn, which is a different card and a different panel. | Team lead | It decides the ladder, the read-out panel and the half-down template (B3) |
| **Q2** | **Are there actions other than demolition?** Section 6.1 draws three because one verb is thin, and only the demolition is ruled. | Team lead | Two cards, two glyphs, and two sets of copy |
| **Q3** | **Is a half-pulled-down building cheaper to repair than a full ruin?** Section 8.1 assumes it might be. | Whoever tunes era five | It decides whether the half-down state needs its own price line in the copy |
| **Q4** | **On the compact board, is a firebreak ever worth it?** The crisis spec measures seven buildings in three rim bands and warns that a break may cost a large fraction of the settlement. **This is a tuning question that presentation cannot answer and that presentation will be blamed for.** | Team lead, with whoever tunes it | If the honest answer is "no", the read-out panel is a machine for telling players their options are bad |
| **Q5** | **Does the fire start in one building or several?** Section 3 assumes one seat. | Team lead | It decides how many smoke columns the scene carries and whether the 460 crop can hold the fire |
| **Q6** | **Does burnt ground differ mechanically from era one's abandoned ground?** Section 8.2 reuses the shipped scar slab wholesale. | Whoever owns `crisis-damage.ts` | If they differ, era five owes a second ground state and a second price |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-8 (the two separating axes,
  and the tile-adjacency ruling), D-CRISIS-20 (immediate against batched, the third axis),
  D-CRISIS-11 (the terminal condition), the section 7 floor check and its ruin-not-deletion framing,
  the section 8 compact-board finding, and INV-CRISIS-1, 3, 4, 5, 6, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, copy rules and
  per-era decal reach
- `docs/superpowers/specs/eras/era-05-medieval/style-guide.md`: the frame on the outside of the
  wall, the roof plane as a face, the failing Classical floor, and the props kit
- `apps/web/src/city/three/ruinStage.ts`: the stage-swap seam era five's burning and burnt states
  join, and its constraints on what may go in it
- `apps/web/src/city/three/ScarredGround.tsx`: the shipped scar slab and its tone
- `apps/web/src/city/three/CityLighting.tsx`: `lightSpec()`, and the `hemiGround` note that section
  2.1 turns into the crisis's global firelight
- `apps/web/src/city/three/WinterGround.tsx` and `winterGround.test.ts`: the emissive-zero guard era
  five should author correctly the first time
- `engines/game/src/hard-winter.ts`: `abandon`, `applyResolution` and `rebuild_cost_per_ruin`, which
  the firebreak is
- #298: era five's buildable radius of 47
- #302: era one's brief, and its section
  4 on the fire problem
