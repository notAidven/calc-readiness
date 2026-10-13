# The Raid: design and asset brief

**Era:** 3, Bronze Age
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era three's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

---

## 0. The hard boundary

**Read `./README.md` first.** The four that bite hardest on era three:

1. **Four global lights, no local light.** A raid at first light is fine. A raid **by torchlight**
   is not: a torch can be a bright face and it will not light the raider carrying it, the ground
   under it, or the wall beside it.
2. **No environment map, so nothing is glassy.** Era three's water has two states and one of them is
   the crisis's stage. **Water cannot reflect a hull, a sail or a sky.** It is a faceted surface
   with per-vertex colour, which is how the lagoon is already built.
3. **No image textures.** Cart ruts, scuffed metalling, a scarred wall: all **relief geometry**.
4. **Nothing tints a building at runtime.** A looted building cannot be drawn by darkening it. It is
   drawn with added geometry, per section 8.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading; emissive
as a bright face up to about 1.35; `useFrame` animation gated on `prefers-reduced-motion`; several
hundred small meshes or one `InstancedMesh`; the shared ground-decal ladder; and the nine lighting
numbers plus sky and fog, which change the whole island for the cost of a table row.

---

## 1. The crisis, and what the player does

**The premise, in one line.** Ships have come in past the mole and men are walking up the metalled
roads toward the town.

**The ritual: I redirect visible routes.** Era three is the only crisis of the ten where the
player's decision is about **a path somebody else is walking**. The raiders' route is drawn on the
board before they take it, and the player's whole job is to change where it goes. **You do not
block, and you do not fight.** You put something across a road and the road they take becomes a
different road.

**The cadence: answer, then act.** Shared with era one, and two eras apart, which the crisis spec
permits. What keeps them separate in the hand is that era one's action lands on **ground** and era
three's lands on **a line through it**.

**Duration: supply exhaustion.** It ends when the raiders are **defeated, diverted, or reach their
objective**. All three are endings. **The third is an ending and not a loss**, and the floor applies
to it: a raider reaching a building must **scar or loot** it, never remove it. Resources lost is a
named permitted consequence; a deleted building is not.

**Entry.** After `ceil(n / 2)` of era three's five nodes (`LIN.1`, `LIN.3`, `LIN.4`, `LIN.5`,
`LIN.6`), which is **three**.

### Why this crisis is era three's and no other era's

Era three is the era the island **grows a front door**. Its guide calls the harbour the era's real
monument, and the reason is economic: this is the first settlement that has to import half of an
alloy. **A town with a quay is a town somebody can arrive at.** The Raid is the quay's consequence,
and the crisis should be staged on it: they come in past the mole, and they come up roads the town
built for its own carts.

### The near collision, and how it is held apart

Eras three, eight and ten all have things moving at the settlement. The crisis spec separates them
by verb: **interception** here, **triage** in era eight, **denial** in era ten. Presentationally
that means:

| | Era three | Era eight | Era ten |
| --- | --- | --- | --- |
| What the player touches | **The route** | **The target** | **The power state** |
| What the board draws ahead of time | The path they will walk | The turn each arrival lands | Which buildings are lit |
| What a good decision looks like | They went the other way | The one that mattered survived | They walked to a dark place and stopped |

**A future change that let era three's player defend a building rather than redirect a road would
collapse era three into era eight**, and it would look like a simplification to whoever made it.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the town is about to be
raided.

**The constraint:** era three's floor in the ground ladder is traction and stone. Terraced plots
with dry-laid revetments, long straight parallel furrows, metalled routes with kerbstones, the quay
and the mole, slag spilling downhill from the smelting hearth. **None of that changes.** The crisis
is a layer on top of it.

### 2.1 The light

**The direction: first light from seaward.** Cold above, warm at the horizon, and long shadows
thrown inland from the water. Era three's raid arrives from the sea, so the light that comes from
the same direction puts the town in its own shadow and silhouettes what is coming.

| Lever | Era three's day preset today | Raid direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Cold at low intensity**, near white with the barest warm cast. Dawn is not gold |
| Key intensity | 1.32 | **Down substantially.** A raid at full noon has no tension in it |
| Key angle | Low and raking | **Very low, and rotated to come from the seaward quarter**, so shadows run inland along the roads the raiders are walking. This one lever does more than anything else in the section |
| Hemisphere sky | `#CFE6F6` | Colder and darker at the top |
| Hemisphere ground | `#C08F57` | **Down and cooler.** Almost nothing is bouncing at this hour |
| Hemisphere intensity | 0.95 | Down |
| Ambient | `#F5EFE2` at 0.30 | Down and cool. The town has not warmed up yet |
| Rim | `#BFDCEF` at 0.48 | **Up.** Silhouette separation is what the whole board depends on: figures on a road against ground |
| Background (sky) | `#BFE1F2` | Dark cool blue at the top, one warm band at the horizon. **The warm band is where the ships are** |
| Fog colour | `#D6ECF7` | Cool, close to the sky's horizon band |
| Fog near and far | `radius x 3` to `radius x 20` | **Pull the far plane well in.** Sea haze is what makes a sail on the horizon read as a threat rather than as scenery |

### 2.2 Ground

**Era three's ground already draws the crisis's board.** The metalled routes with kerbstones run as
a network, which is exactly the graph the raiders walk. The crisis adds two courses on the decal
ladder:

- **The marked route.** The road the raiders are on, marked along its length. **Not a coloured
  road:** a run of small **cast bronze route studs** set into the metalling between the kerbs, one
  per cell, standing about a quarter of a unit proud. Era three's whole signature move is metal at
  the joint, and a stud set into a road surface is that move applied to the ground.
- **Churned metalling** behind them, where a group has passed: the rammed gravel scuffed into ruts,
  the kerbstone knocked out of line. Relief, not tone.

**The reach question.** Under #298 era
three's buildable radius is **36**, and era three is **the first era whose buildable disc leaves the
drawn grass** (radius 30). Its 256 cells cover 4,096 square units against a 2,827 unit grass disc.
**So the problem inverts from era one's:** there is no ring left uncovered, there is ground drawn
outside the island. **Era three's ground layer must clip to the drawn island**, and #298's own test
records that the island art has not grown to match. Flagged in section 12.

### 2.3 Vegetation

**Era three's own first is the planted tree**, a short line of the same species at the same spacing,
and it is the thing the era's guide says must be unmistakable. **The crisis leaves it alone.** A
raid does not change what is planted.

One permitted change: **the orchard rows have been stripped in a hurry**, fruit on the ground, a
ladder left leaning. Prop dressing, no new plant.

### 2.4 Water and shoreline

**This is era three's best asset and the crisis should spend most of its budget here.**

Era three's guide records that this is **the first era in which the water has two states**: flat and
dead inside the mole, still moving outside it, with the boundary a straight line drawn by a
structure. That is the crisis's staging, free:

- **The ships are outside the mole**, in the moving water, as silhouettes at the fog's near edge.
  Two or three hulls with square sails, low and dark. **They do not need to be detailed and they
  must not be reflective**: there is no environment map, so a hull sits on the water rather than in
  it.
- **The harbour inside the mole is cleared.** The town's own working boats pulled up above the
  waterline, the plank staging empty, the lashed-timber crane frame swung in and tied.
- **The mole itself is the line the crisis crosses**, and the moment a landing happens it should be
  visible there: staging displaced, a mooring rope cut and trailing.
- **The water is not stained and does not change colour.** Whatever happens on it, era three's water
  keeps its two states.

### 2.5 Signs of habitation at the margins

**A working town that stopped working.** All of this is era three's existing props kit, re-posed:

- **The bronze-strapped gate is barred.** The era's kit carries the gate in both states, open and
  shut, precisely because the fittings are its ornament. **Shut is the crisis pose.**
- **The smelting hearth is doused**, bellows dropped, charcoal heap covered with matting. The slag
  that spilled downhill stays: it is the era's permanent scar and not a crisis state.
- **The first wheeled cart is tipped and abandoned** mid-route, load spilled. The kit already
  carries a tipped-and-empty variant.
- **Ingots have been carried inside.** The lean-to by the quay is empty, which is a fact about a
  raid nobody has to explain.
- **String lines still pegged out** where work paused, which the kit lists and which says "they left
  in the middle of something" better than anything new would.

### 2.6 Does anything move

**Yes, and this is the one crisis of the nine where the moving thing is the antagonist.**

- **The raiders are meshes on the board**, posed one per route cell they occupy. **They advance on a
  turn, not over time.** A raider's position changes when the player acts and never otherwise.
- **Between turns they may idle**, at most a small sway, and the idle must be posed still under
  `prefers-reduced-motion`.
- **The advance itself should be a short interpolation and not a walk cycle**, for two reasons: a
  walk cycle implies a duration the mechanic does not have, and a raid that resolves in six turns
  cannot afford a locomotion rig for each of them.
- **Sails move, slowly.** The ships are the only ambient motion, and they should be nearly
  imperceptible.
- **Nothing that moves may advance the encounter.**

### 2.7 The transition, in and out

**In:** the lighting numbers, the sky's warm horizon band, the fog pulled in, the ships appearing,
the harbour clearing, the gate barring, the route studs appearing on the first road.

**What never changes:** the buildings, the roads themselves, the quay, the terraces, the furrows,
the island's geometry.

**Out:** three different endings and three different exits, which is worth authoring separately
because they are the crisis's whole outcome vocabulary. **Defeated:** the ships gone from the
horizon. **Diverted:** the ships still there and the route studs pointing away past the settlement.
**Objective reached:** the ships gone and the scars staying.

### 2.8 The read, in one sentence

*The same trading town at first light with its gate barred and its boats pulled up, three sails
outside the mole, and a line of studs up the road showing where they will walk.*

---

## 3. The hazard

### 3.1 The three questions the board must answer

1. **Where are they now?** Position on the route network.
2. **Where are they going next?** This is the axis. **The route must be visible ahead of them** or
   the player is guessing rather than intercepting.
3. **What are they walking toward?** The objective, and what it costs if they reach it.

### 3.2 The route, which is the whole design

**The route is drawn from the raiders forward to their objective, at all times, before the player
acts.** Era three's crisis has no hidden information and that is deliberate: hiding is era two's and
era nine's, and giving era three a hidden route would collapse three crises into one.

- **Route studs** mark every cell the raiders will cross, in order.
- **The next cell is a taller stud with a cast collar**, so the immediate step reads apart from the
  rest of the path. It is the same relationship era one's frost line has to the frost behind it: the
  only part that moves next.
- **Where two roads meet, the junction carries a turned stud** showing which way the route goes.
  Junctions are where the whole decision happens, so they get the strongest mark on the board.

### 3.3 The raiders

**A raider is a mesh, not a portrait.** The camera is fixed and far, and the era's own guide says
grain survives distance better than height does.

- **Silhouette first:** a low dark mass with two vertical accents, reading as a figure with a spear
  at the zoom the game holds. Detail below that threshold is wasted.
- **Group, not individual.** Raiders arrive and move as a **band** of three or four figures on one
  cell, which is what makes them read at zoom-out and what keeps the mesh count sane.
- **Bronze at the joint, as everywhere in this era:** a helmet rim, a shield boss, a spear ferrule,
  in the era's patina accent. That is what makes them era three's raiders and not generic hostiles.
- **No banner, no war paint, no colour coding.** They are the only moving thing on the island and
  they need no further marking.

### 3.4 The objective

**The objective is drawn as a place, not as a target.** Era three's storage is the tall jars in rows
and the ingot lean-to, and the objective should be **the metal**, because the era's premise is that
metal has to be got rather than dug.

Draw it as a **ring of mooring-block stone set into the ground around the objective building**, on
the decal ladder, with the objective's own name in the rail. **It is not a crosshair and it is not
red.** Red means "you answered wrong" on this screen.

---

## 4. The player's own mark

**The gate.** A barred double leaf, bronze-strapped, on two stone posts, standing across a road
between its kerbs. Era three's props kit already carries it in both states and the crisis needs no
new material to place one.

### 4.1 What the gate does, visually

A gate on a route cell **closes that cell**, and the route redraws around it. That redraw is the
crisis's whole feedback loop and it must be instantaneous and unmistakable:

- The studs on the closed run **drop flush** and go quiet.
- The studs on the new run **rise**, from the junction outward.
- **The junction stud turns**, which is the single frame the player is reading for.

### 4.2 The three rungs

Accuracy sizes the action and never decides whether it happens (INV-CRISIS-4). **What exactly it
sizes for a gate is not ruled and is [Q1](#13-open-questions).** The presentation is drawn on the
reading that accuracy sizes **how much of the junction the gate commands**, because that is the
reading where the preview stays a *route* preview and the axis stays interception:

| Rung | The gate, drawn | On the board |
| --- | --- | --- |
| **1 right** | A **hurdle and a stake line**: a barrier, not a gate | Closes the one cell it stands on |
| **2 right** | **The gate on one post**, the leaf hung and braced | Closes its cell and the junction behind it |
| **3 right** | **The full bronze-strapped double leaf on two posts** | Closes the junction and the road behind it |

**The bottom rung still builds something.** A stake line that turns nobody is era three's equivalent
of era one's fire that wards nothing: the declaration happened, it is on the board, and it did
little.

### 4.3 The gate's states

| State | What it means | What it looks like |
| --- | --- | --- |
| **Standing** | It is closing its route | Leaf shut, straps and studs catching the low light as tone steps, not as shine |
| **Turned** | Raiders reached it and went another way | Unchanged. **The absence of damage is the success state**, and the route studs past it are what shows the diversion |
| **Forced** | Raiders came through it | Leaf hanging off one hinge, one post out of plumb. **Geometry, not tone.** It stays on the board for the rest of the crisis |

---

## 5. The crisis surface

### 5.1 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.** The raiders come in from the rim and
walk inward, so a centred panel would sit exactly on the ground the player is reading. Same rule as
era one and for the same reason.

Rail order:

1. **Header**: the crisis name, and **how far they have come**, as a run of pips along a line with
   the objective at its end. **Not a progress bar**, which reads as time. A line of steps with a
   marker on one of them.
2. **The route summary**: where they are, where they go next, and what they are walking toward, as
   three short lines.
3. **The gate cards.**
4. **The read-out panel** when a placement is armed.
5. **The commit control.**

### 5.2 At 460

Single column, **board first**, cropped 4:3 on the settlement with the objective and the raiders both
in frame. **If they cannot both be in frame the crop follows the raiders**, because the route is the
subject.

The header's step line collapses to a sentence: *"Three roads from the store."* The route summary
stays; it is the cheapest element and the most load-bearing.

### 5.3 The hierarchy

**The board is the subject and the junctions are the focal points.** Everything in the rail is a
caption on a decision the player makes by looking at the ground.

---

## 6. The option cards

**Era three has few actions and they are genuinely different kinds**, which is the case era one
failed. The cards must not look alike.

### 6.1 The actions

| Action | Kind of answer | Glyph |
| --- | --- | --- |
| **Bar a road** | The interception answer: close a cell and turn the route | A gate leaf across two rails |
| **Open a road** | The inverse, and the era's own trick: **unbar** something to make a longer route more attractive than a shorter one | The same leaf, swung |
| **Carry the metal inside** | The denial answer: move the objective, so what they walked toward is not there | A jar with a lid, and an arrow into a doorway |

**Whether the third exists is a mechanics question** and it is [Q2](#13-open-questions). It is drawn
here because "reach their objective" is one of the three ruled endings and a player with no way to
touch the objective has one verb rather than two.

### 6.2 The card

428 units wide, about 96 tall. A **40 unit action glyph** on the left, from the table above. Then the
action name at 16 units, a one-line statement of what it does at 13, and the three-rung ladder as
three pips.

**The glyph is what makes the cards different**, and it is the single cheapest fix for the failure
era one had. Four white boxes with four different sentences in them is four white boxes.

### 6.3 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2 units, card lifts 1 unit, **no colour change**, and **every road cell this action could act on raises its studs on the board** so the player sees the legal set before choosing |
| **Armed** | 3-unit border, filled corner flag with a check glyph, the word **Chosen** top right, `aria-pressed="true"` |
| **Unavailable** | **The reason replaces the ladder** in the card body: *"Nothing left to bar on their route."* `disabled`, with `aria-describedby` on the reason |
| **Committed** | 6-unit diagonal hatch across the card, ladder replaced by the declared line, and it looks locked rather than selected |

### 6.4 Cost

**Barring a road costs nothing but the turn.** Era three's cost is paid elsewhere: **a barred road
is a road the town cannot use either**, and if the crisis models that, the cost belongs on the card
in its own zone, styled as a cost and separated from the benefit. That is era one's lesson about the
pull-back card applied here.

**Whether a barred road stays barred after the crisis is [Q3](#13-open-questions).**

---

## 7. The read-out panel

### 7.1 What it is for

The player has armed a gate on a cell and has not committed. **The question is not "does this
close?"** It is **"where do they go instead?"**

### 7.2 The direction

- **The panel's main element is the rerouted path**, drawn as a small plan of the road network with
  the current route and the proposed route both on it. **This is era three's own preview and it is
  not era one's:** era one previews an area, era three previews a line.
- **Lead with the smallest outcome**, as everywhere in this folder. At one correct answer the
  barrier closes one cell, and if that changes nothing the panel must say so plainly.
- **Name what the new route reaches.** The stake is the buildings on it. A reroute that sends them
  past the store is a good outcome; a reroute that sends them past three houses is a decision.
- **Say when it is a bad bet.** If every rung produces the same route, that is a finding about the
  player's choice and it should be stated: *"They come the same way at every result."*

### 7.3 The provisional register

**Provisional route runs are outlines, never studs.** A committed route has studs set into the road;
a proposed one is drawn as **a raised outline running between the kerbs**, with a numeric badge at
its head giving the number of correct answers that reaches it. A player must never confuse the road
they will walk with the road they might.

---

## 8. Damage and consequence

**The floor bites hardest here and in era eight**, and the crisis spec says so: raiders reaching a
building must scar or loot it, never remove it.

### 8.1 The two harms, and they are different

| Harm | What it is | How it draws |
| --- | --- | --- |
| **Looted** | Resources taken. A **named permitted consequence** | The building is **undamaged**. What changes is at its foot: the jars tipped and empty, the lean-to bare, the doors off their pins. **Prop state, not building state** |
| **Scarred** | The building damaged but standing | **Added geometry** on the building: a leaf off its hinges, a section of roof opened, a post out of plumb. Plus a **scarred-ground** slab at its foot on the shared `worn` rung |

**Looted and scarred must not converge.** One is a bill and the other is a repair, and a player who
cannot tell them apart cannot tell what it will cost to put right.

### 8.2 The ruin

If accumulated harm ruins a building, it becomes a **ruin stage** through the shipped path
(`ruinStage.ts`): the same node, at the same cell, with its silhouette collapsed. **It is still a
click target and its lesson is still reachable.** Nothing here removes a building, and
`crisis-damage.ts` has no field that could record one.

### 8.3 Repair

A ruin is rebuilt at `rebuild_cost_per_ruin`; scarred ground is reclaimed per cell. Both prices
already exist for era one and neither has an era-three denominator, because `materialForEra` returns
`null` for every era but `prehistoric`.

**Drawn:** the repair cross-fades the ruin stage back to the stage the building was already at,
which is the shipped behaviour and needs no new asset.

### 8.4 The three endings, as consequence

| Ending | What stays on the island |
| --- | --- |
| **Defeated** | The gates the player built, and nothing else |
| **Diverted** | The gates, and the churned metalling along the route they took out past the settlement |
| **Objective reached** | The looted props, any scars, and the churned metalling. **This is an ending with consequences and it is not a loss**, and the copy in section 9 says so without narrating it |

---

## 9. The copy

**Register: results, not purchase.** Era three is exposed to it through the ladder: "three correct
answers buys the full gate" is the sentence to avoid. Write what the answers **built**.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only, and the prose scanner that could read TSX is in no CI step at all. A
reviewer is the only enforcement on this surface.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Raid** |
| Entry announcement, heading | **Ships past the mole** |
| Entry announcement, body | Three hulls came in at first light and men are on the coast road. You can go down when you are ready. |
| Entry announcement, control | **Go down to the gate** |
| Header, progress | **Three roads from the store** |
| Board label | The island. Choose a road to bar. |
| Route summary | They are on the quay road. Next they take the terrace turn. They are walking to the ingot store. |
| Declare heading | **Choose a road** |
| Declare body | Pick a road, then answer {n} questions. How many you get right sets how much of the junction you hold. |
| Commit control | **Set the gate** |

### 9.2 The cards

| Line | String |
| --- | --- |
| Bar a road, name | **Bar a road** |
| Bar a road, body | Puts a gate across it. They take the next road instead. |
| Open a road, name | **Open a road** |
| Open a road, body | Unbars a road you closed. Sometimes the long way round is the way you want them going. |
| Carry it inside, name | **Carry the metal inside** |
| Carry it inside, body | Moves the ingots off the quay. What they walk to will not be there. |
| Ladder rung 1 | 1 right: a stake line across the road |
| Ladder rung 2 | 2 right: a gate on one post, holding the junction |
| Ladder rung 3 | 3 right: the full gate, holding the road behind it |
| Unavailable | Nothing left to bar on their route. |
| Armed | **Chosen** |
| Committed | Gate set here. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **A gate on the terrace turn** |
| Smallest first | With 1 right, you hold the one cell. They come round it. |
| Middle | With 2 right, you hold the junction. They turn west, past the houses. |
| Best | With 3 right, you hold the road behind it. They turn west and go the long way, past nothing. |
| No effect | They come the same way at every result. Try a road nearer the junction. |
| The bet | You can see where they would go. You cannot see the score yet, and that is the choice. |

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
| Last question | **See what you built** |

**Where it sits:** below the answer field, same panel, same position in both cases. Field read-only,
verdict above the solution, **no retry control**. The tally is recorded and this panel cannot change
it.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Full gate | 3 right. The gate is up on both posts and it holds the road behind it. |
| Partial | 2 right. The gate is hung on one post. It holds the junction. |
| Minimal | 1 right. A stake line across the road, and not much more. |
| None | 0 right. The posts are in the ground and there is no gate on them. |
| They turned | They came to the gate and went west instead. |
| They came through | They forced the gate on the terrace turn. |
| Looted | They took what was in the store. The jars are empty and the doors are off. |
| Scarred | The {building} took damage. It is standing, and it needs work. |
| Defeated | **They have gone.** The sails are off the horizon. |
| Diverted | **They went past.** They took the long road and left the town alone. |
| Objective reached | **They got to the store.** The metal is gone, and the town is still here. |

**On the last line:** it says what happened. It does not tell the player they lost, and it does not
editorialise. An objective reached is a ruled ending, not a failure.

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.**

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Route cell | one tone | **Raised studs**, and the route is named in the summary line |
| Next cell on the route | one tone | **Taller stud with a collar**, and it is named: *"next they take the terrace turn"* |
| Junction, turnable | one tone | **Turned stud**, plus a card that lists it |
| Proposed route | outline tone | **Raised outline, not studs**, plus a **numeric badge** 1 / 2 / 3 |
| Gate standing | none | Geometry: leaf shut |
| Gate forced | none | Geometry: leaf off one hinge, post out of plumb |
| Building looted | none | **Prop state** at its foot, plus a status line |
| Building scarred | none | **Added geometry**, scarred-ground slab, status line |
| Building ruined | none | **Silhouette collapse** (ruin stage), status line |
| Card armed / committed / unavailable | border | Corner flag glyph; diagonal hatch; reason text in the body |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Road cell, on the route | `The terrace turn. On the raiders' route, two steps ahead of them.` |
| Road cell, off the route | `The kiln road. Not on their route.` |
| Gate card | `Bar a road. Puts a gate across it and they take the next road instead. One correct answer holds the cell, two holds the junction, three holds the road behind it.` |
| Gate on the board | `A gate on the terrace turn, on two posts, holding the road behind it.` |
| Forced gate | `A forced gate on the terrace turn. They came through here.` |
| Raider band | `Raiders on the quay road, three steps from the ingot store.` |
| Objective | `The ingot store. This is what they are walking to.` |
| Progress line | `They are three roads from the store.` |
| Looted building | `The ingot store. Standing and empty. They took what was in it.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **The route is a shape on the ground.** It must also be a sentence, listing the cells in order from
  the raiders to the objective, and it is re-announced whenever it changes.
- **A reroute is the whole feedback of this crisis** and it happens on the board silently. It gets a
  polite live region: *"They now take the kiln road, past the two houses."*
- **Distance to the objective** is pips on a line. It is also the header's spoken name.

---

## 11. The consolidated asset list

**27 items.** No entry is a bitmap.

### Atmosphere (7)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Raid lighting preset: nine numbers, plus the key rotated to the seaward quarter | Treatment |
| A2 | Sky and fog preset: dark top, one warm horizon band, fog pulled in | Treatment |
| A3 | Raider ship: hull and square sail, at silhouette detail, 2 or 3 variants | Geometry |
| A4 | Cleared-harbour dressing: boats pulled up, staging empty, crane swung in and tied | Geometry, from existing props |
| A5 | Doused-hearth dressing: bellows down, charcoal under matting | Geometry, from existing props |
| A6 | Barred-gate pose for the era's existing bronze-strapped gate | Treatment |
| A7 | Slow sail motion, with a posed reduced-motion still | Animation rig |

### The board (9)

| # | Item | Kind |
| --- | --- | --- |
| B1 | Cast bronze route stud, set into the metalling | Geometry |
| B2 | Next-cell stud: taller, with a cast collar | Geometry |
| B3 | Junction stud, turned, showing which way the route goes | Geometry |
| B4 | Proposed-route outline run, between the kerbs, with a numeric badge | Geometry |
| B5 | Churned metalling: scuffed ruts, kerbstone knocked out of line | Geometry, 3 variants |
| B6 | Raider band: a low mass with two vertical accents and bronze at the joint | Geometry |
| B7 | Raider advance interpolation, and its posed still | Animation rig |
| B8 | Objective ring: mooring-block stone set into the ground | Geometry |
| B9 | Island clip for the ground layer, so cells past radius 30 are not drawn | Treatment |

### The gate (4)

| # | Item | Kind |
| --- | --- | --- |
| G1 | Stake line: the bottom rung | Geometry |
| G2 | Gate on one post, braced: the middle rung | Geometry |
| G3 | Full bronze-strapped double leaf on two posts: the top rung | Geometry |
| G4 | Forced gate: leaf off one hinge, post out of plumb | Geometry |

### Damage (3)

| # | Item | Kind |
| --- | --- | --- |
| D1 | Looted dressing: jars tipped and empty, lean-to bare, doors off their pins | Geometry, from existing props |
| D2 | Scar geometry on a building: opened roof, leaf off, post out of plumb | Geometry, 3 variants |
| D3 | Scarred-ground slab, reusing `ScarredGround` on the `worn` rung | Material |

### The UI (4)

| # | Item | Kind |
| --- | --- | --- |
| U1 | Action card design and its five states | DOM |
| U2 | Action glyphs: bar, open, carry inside | SVG x3 |
| U3 | Read-out panel with the road-network plan and both routes | DOM + SVG |
| U4 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 20 geometry items or sets, 2 animation rigs, 3 SVG sets, 3 DOM designs, 4
treatments. **Build A1 and B1 to B3 first.** The lighting changes the whole picture for a table row,
and the studs are the crisis: without a visible route there is no interception axis to play.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

1. **Torchlight.** Raiders at first light carrying torches is the obvious image and it cannot be
   drawn. A torch is a bright face that lights nothing: no glow on the carrier, no pool on the road,
   no light on the wall beside it. **Four global lights, no `pointLight`.** The atmosphere is
   specified as first light rather than pre-dawn for exactly this reason.
2. **A lit watchfire on the headland as the alarm.** Same constraint, and the same shape of problem
   era one has with its fire. A watchfire can be geometry with an emissive face and a smoke column,
   and the smoke is the part that will actually read.
3. **Reflections of hulls and sails on the harbour water.** No environment map, nothing to reflect,
   and `metalness: 0` across the island. Era three's water is faceted with per-vertex colour and
   that is the whole toolkit.
4. **Wakes behind the ships.** A wake is a moving surface deformation on water that is currently a
   static vertex-coloured disc. It is geometry work rather than an impossibility, but it is not free
   and it is not an asset.
5. **A per-cell ground layer at era three's authored radius, drawn today.** Under #298 the buildable
   radius is 36 against a drawn grass radius of 30, so **256 cells of route studs would extend past
   the island onto nothing.** #298's own test records the divergence and says the radii are a design
   figure until the island-growth lane lands. **B9 exists in the asset list because of this**, and
   it is the first thing to check when the island does grow.
6. **A walk cycle for the raiders.** Not impossible, and deliberately not wanted: an animated walk
   implies elapsed time in a crisis that advances only on player actions.
7. **Buildings visibly reacting as raiders pass.** Shutters closing, people going indoors. Nothing
   tints or animates a building GLB at runtime, so each would be per-building geometry across a
   growing set.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **What does accuracy size for a gate?** Section 4.2 is drawn on "how much of the junction it commands", which keeps the preview a route preview. The alternatives are how many turns it holds, or how much it costs them to force. | Team lead | It decides what the read-out panel shows, and the read-out panel is the crisis's main UI element |
| **Q2** | **Can the player move the objective?** *"Reach their objective"* is one of three ruled endings, and nothing says the player may touch it. Section 6.1 draws the card because one verb is thin. | Team lead | It is a whole action card, its glyph, its ladder and its copy |
| **Q3** | **Does a barred road stay barred after the crisis?** If so it is a persistent change to the road layer, which is D-ERA30's, and the gate becomes a permanent object rather than a crisis one. | Whoever owns the road layer | It decides whether G1 to G3 are crisis assets or city assets, and whether the gate needs a repair or removal path |
| **Q4** | **How many raider bands, and do they split?** One band walking one route is a simple board. Two bands is a genuinely different UI, because the route summary and the header both assume one. | Team lead | It decides whether the rail can carry one route summary or needs a list |
| **Q5** | **Is the compact board a problem for this crisis specifically?** The crisis spec's section 8 names the Raid as one of two crises whose axis depends on buildings being far enough apart, and measures the live board at seven buildings in three rim bands. **A route network across a compact town may have too few junctions to make redirection a decision.** | Team lead, with whoever tunes it | If there are two junctions the crisis is a coin flip, and no amount of presentation fixes that |
| **Q6** | **Does looting show which resource was taken, and how much?** Section 8.1 draws it as prop state with no number. | Team lead | It decides whether the outcome panel owes a ledger line |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: the ten axes and the three
  near-collisions, D-CRISIS-9 and D-CRISIS-24 (entry), D-CRISIS-11 (the three endings and their
  terminal conditions), the section 7 floor caveat for era three, the section 8 compact-board
  finding, and INV-CRISIS-1, 3, 4, 5, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, copy rules and
  per-era decal reach
- `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md`: metal at the joint, the quay and
  the mole, the two water states, the metalled route network, and the props kit
- `apps/web/src/city/three/WinterGround.tsx`: the decal ladder, the outline builder and the badge
- `apps/web/src/city/three/ruinStage.ts`, `ScarredGround.tsx`: the shipped damage vocabulary
- `apps/web/src/city/three/Roads.tsx`: the road layer the route studs sit on, and its own note about
  continuing one depth ladder rather than starting a second
- #298: era three's buildable radius of
  36, and the first past the drawn grass
- #302: era one's brief
