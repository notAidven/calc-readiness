# The Robot Uprising: design and asset brief

**Era:** 10, Cyberpunk
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era ten's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

**Era ten is the one crisis of the nine whose light mechanic is buildable**, and section 4 explains
why: it is subtractive. It is also the crisis whose ruled ritual comes closest to breaking the
clockless invariant, and section 5.1 reports that rather than working around it quietly.

---

## 0. The hard boundary

**Read `./README.md` first.** Era ten's relationship to it is unusual and worth stating up front.

**Era ten's own style guide already designs to this renderer, and it is the only era that does.** Its
signature move is *"the emissive edge"*, and it defines it exactly as this renderer implements it:

> Light is used as **trim**: a line along a parapet, a strip under a soffit, a glowing reveal round a
> window, a lit seam where two panels meet. **It is not there to illuminate anything, and that is
> what makes it ornament rather than lighting.**

**That is a bright emissive face that lights nothing, described as a design intent rather than as a
limitation.** So era ten's whole visual identity is native to what this renderer can do, and the
crisis inherits that.

**What still bites:**

1. **No reflections.** Era ten's ground strategy is **wet deck carrying the signage down onto the
   floor as colour**, and its water is *"lit from the edges and from below"* so it *"carries
   reflected signage"*. **There is no environment map and nothing can reflect anything.** This is
   the largest gap in era ten and section 2.2 gives the substitute.
2. **No bloom.** A neon city without bloom is a city of flat bright rectangles.
   `@react-three/postprocessing` is not a dependency.
3. **No image textures.** Era ten's stacked signage, its animated displays and its graphic faces are
   geometry with emissive faces, or a procedurally drawn `CanvasTexture` where content is needed.
4. **No local light.** A lit gantry under the deck lights nothing under the deck.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading;
**emissive as a bright face up to about 1.35, which era ten uses more than any other era**;
**material changes on existing geometry, which is what this crisis's central mechanic is**; a
procedurally drawn `CanvasTexture`; `useFrame` animation gated on `prefers-reduced-motion`; the
shared ground-decal ladder; and the nine lighting numbers plus sky and fog.

---

## 1. The crisis, and what the player does

**The premise, in one line.** The machines have gone their own way, they walk toward whatever is
powered, and the only thing that stops them is a dark city.

**The ritual: I reconfigure the city's power state.** Era ten is the only crisis of the ten where
the player **takes their own city away** to survive it. It is also the only one whose verb is
**denial**: you do not block them and you do not intercept them, **you remove the thing they are
walking toward.**

**The cadence: a planning phase, alter the grid, then resolve it.** Section 5 is built around it, and
section 5.1 reports the one place where the ruled cadence and the clockless invariant meet.

**Duration: supply exhaustion.** It ends when **every robot is trapped or destroyed, or the city is
dark.**

**The inversion, which is why this crisis is last.** *You survive by switching your own city off*, in
a game where growth has always meant powering more of it. Every era up to this point has rewarded
building, placing, mastering and lighting. **Era ten's answer is to take it back, temporarily and by
choice.** Placed at era three it would be a rule. Placed at era ten it is a reversal, and it only
reads as one to a player who has spent nine eras doing the opposite.

**"The city is dark" is an ending with consequences and never a loss.** A player who switches
everything off has **solved** the crisis at the maximum price. `HardWinterOutcome` has no `lost` and
no `failed`, and *"a losable encounter would be the first dead end in a codebase that has carefully
avoided them"*. **Section 9's copy is written to that and it is not negotiable.**

**Entry.** After `ceil(n / 2)` of era ten's nodes. **Era ten is one of only two eras that does not
fire at three:** it has **nine** (`TRG.1` to `TRG.9`), so it fires at **five**.

### 1.1 Era ten against eras three and eight

| | Era three | Era eight | Era ten |
| --- | --- | --- | --- |
| The verb | Intercept a route | Triage against a schedule | **Deny the destination** |
| What the player touches | The route | The target | **The power state** |
| What moves | Raiders on roads | Nothing visible | **Robots on the deck** |
| The characteristic failure | Blocking the wrong road | Saving the wrong building | **Leaving something lit** |

**Eras three and ten share mobile agents with pathing**, which is a capability neither has and which
the crisis spec recommends building once for both. **The presentation must not converge:** era
three's raiders walk a route the player redraws, and era ten's robots walk toward whatever is lit, so
**era ten never draws a route ahead of them.** Section 3.3 covers what it draws instead.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the machines are out.

**Era ten's atmosphere shift is the crisis's own mechanic**, which no other brief in this folder can
say. As the player switches the city off, the island goes dark, and **the state of the world is the
state of the board.** That is the strongest fusion of atmosphere and mechanic available anywhere in
the ten and it should be leaned on hard.

**But there must be a shift at entry too**, before the player has done anything, or the crisis
announces itself with nothing.

**The constraint:** era ten's floor in the ground ladder is the **deck**: perforated metal, dark
composite panel and resin with aggregate, carried on structure above the older ground, with gaps and
grilles you can see down through, wet almost everywhere, level changes stacked close together.
**None of that changes.**

### 2.1 The light

**The direction at entry: the public light goes and the private light stays.**

Era ten's town is lit by two different things: the scene's own key and ambient, and the buildings'
emissive trim. **The crisis takes the first and leaves the second**, which is both dramatic and
mechanically exact, because the trim is what the player then switches off building by building.

| Lever | Era ten's day preset today | Uprising direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Cold blue-grey.** Era ten has no warm light that is not emissive |
| Key intensity | 1.32 | **Well down.** Not to zero: the deck must still read as a surface with things standing on it |
| Key angle | Low and raking | Low. Long shadows across a deck full of edges |
| Hemisphere sky | `#CFE6F6` | Very dark, cold |
| Hemisphere ground | `#C08F57` warm earth | **Dark, and slightly cyan.** Era ten's ground bounce is its own lit seams, which is the one place the accent belongs in the light rig |
| Hemisphere intensity | 0.95 | Down |
| Ambient | `#F5EFE2` at 0.30 | **Down hard.** Ambient is what makes an emissive face look dull, and era ten's whole read depends on the trim being the brightest thing |
| Rim | `#BFDCEF` at 0.48 | **Keep, and cool.** With the key down, the rim is doing most of the silhouette separation |
| Background (sky) | `#BFE1F2` clear blue | **Near black with a cold cast.** Era ten is the one era where this is correct rather than melodramatic |
| Fog colour | `#D6ECF7` | Dark and cold |
| Fog near and far | `radius x 3` to `radius x 20` | **Pull both in.** A city whose edges disappear is the right read for a crisis about what is lit |

**The one rule for the whole rig: the darker the scene light, the more the emissive trim carries.**
That is exactly what era ten wants and it is also the crisis's information channel, so **the light
rig must be judged with the board's lit and unlit buildings both in frame**, not on a still of the
town at full power.

### 2.2 Ground, and the reflection substitute

**Era ten's ground legibility is authored as a reflection problem and it cannot be solved that way.**
Its guide says the deck is *"wet almost everywhere, so the ground is reflective and carries the
signage as colour"*, and calls this *"the one era in the run where the ground's legibility is solved
by light"*.

> **The substitute, and it is in era ten's own guide already.** The same guide says a route is marked
> by **"lit seams, edge strips and emissive banding let into the deck"**. **So the ground carries
> light directly rather than by reflecting it.** Emissive geometry set into the deck is buildable and
> a reflection is not, and the two look far more alike than they sound: an emissive strip in a dark
> wet-looking deck reads as a lit floor either way.

**What the crisis adds to the ground:**

- **The lit seams are switchable.** They are part of the power grid, so a district switched off has
  dark seams. **This is the largest and most legible piece of state in the crisis**, because it is
  the biggest emissive area on the island.
- **Grilles and gaps stay.** Era ten's deck is defined by being able to see down through it, and the
  crisis must not close it up.
- **Puddles stay flat and dark.** They are a value change in the deck, not a mirror.

**The reach question, and era ten is the largest of the ten.** Under
#298 era ten's buildable radius is
**69**, with **936 cells**, past the drawn grass at 30 and past the lagoon at 58. **The ground layer
must clip to the drawn island**, and era ten is where the gap between the authored radius and the
drawn island is widest of all.

### 2.3 Vegetation

**Era ten's planting is engineered, sealed and lit**, and the lit containers are on the grid: **a
switched-off district's planters go dark with it.** That is free state, and it is worth having
because a planter at ground level reads where a parapet strip may be occluded.

**The weed in the deck gaps stays.** It is the only unmanaged growth left on the island and the last
descendant of era one's scrub, and it is not on the grid.

### 2.4 Water and shoreline

**Era ten's water is *"channelled and lit"*, lit from the edges and from below, and it *"carries
reflected signage"*.** The reflection half is unbuildable. **The lit half is not:** the edge lighting
is emissive geometry along the channel and it reads.

**In the crisis the water's edge lighting is on the grid too**, so a dark city is a dark channel. That
closes the era's own arc rather neatly: era one's pale shallows you could see the bottom of become a
dark contained channel with the lights off.

### 2.5 Signs of habitation at the margins

**A city that has locked itself in**, from era ten's own kit:

- **Every camera and sensor cluster is turned the same way.** One rotation applied to an existing
  prop, and it is the cheapest way to say something is being tracked.
- **The drone docks are empty**, cradles open, parcel lockers shut.
- **The stacked signage is in its alert state**, which for era ten means **more of it is dead and
  more of it is flickering**. The guide already specifies signage *"some dead and some flickering"*
  as a normal condition; the crisis shifts the proportion.
- **Steam vents venting harder.** Geometry and motion, no light needed.
- **Rubbish caught in the gratings**, as always. Nothing to author.

### 2.6 Does anything move

- **The robots.** They advance on a step the player takes, never on their own. Section 3.3.
- **Animated displays.** Era ten's tally descendant is *"a scrolling figure, a climbing bar, a
  cycling panel"*, and they are the era's authored ambient motion. **In the crisis they stay
  running**, which is unsettling in the right way: the city's instruments are working and nobody is
  reading them.
- **Steam from the vents.**
- **Flicker on the dead signage.** Era ten's own authored condition.
- **Every animation is gated on `prefers-reduced-motion`.**
- **Nothing that moves may advance the encounter.** Section 5.1 is where this bites.

### 2.7 The transition, in and out

**In:** the lighting numbers, the near-black sky, the fog pulled in, the cameras turning, the drone
docks emptying, the first robots appearing at the deck edge.

**What never changes:** the buildings' geometry, the deck, its grilles and gaps, the island's
structure, the shoreline.

**Out, and era ten has two exits that must look different:**

| Ending | What the island looks like |
| --- | --- |
| **Every robot stopped, city still lit** | The trim comes back on across the town, district by district, in the order the player switched it off |
| **The city is dark** | **It stays dark, and the robots have stopped in it.** The lights come back at the resolution panel, not before |

**The second must not read as a failure state.** The city comes back. What it costs is in section 8,
and it is a real cost rather than a defeat.

### 2.8 The read, in one sentence

*The same lit deck under a near-black sky with its public light gone, the trim on every building the
only thing showing, cameras all turned one way, and things walking in from the edge toward whatever
is still on.*

---

## 3. The hazard

### 3.1 The three questions the board must answer

1. **What is lit?** This is the crisis. **A player's whole plan is a reading of what is still
   powered.**
2. **Where are the robots, and what are they walking toward?**
3. **What is dark, and therefore safe?**

### 3.2 What is lit, which is the board

**Era ten's power state is drawn by the buildings' own trim**, and it needs a second channel because
a dark building on a dark deck at full zoom-out could vanish.

| State | Emissive | Second channel |
| --- | --- | --- |
| **Powered** | Trim lit: parapet lines, soffit strips, window reveals, panel seams | The building's **isolator lever** at its base stands **up** |
| **Dark** | **Trim at zero.** The building is its own unlit body | The **isolator lever is thrown down**, and a **hazard chevron plate** stands beside it |
| **Powered, and a robot is walking to it** | Trim lit | **A raised marker ring on the deck at its threshold**, plus the robot itself pointed at it |

**The isolator lever is the state's non-colour carrier and it is what makes the board legible.** Era
ten's props kit is full of exposed conduit, cable trays and junction boxes, so a physical isolator at
a building's base is the era's own vocabulary, and a thrown lever is a silhouette fact that survives
zoom-out and greyscale.

### 3.3 The robots

**A robot is a mesh with a distinct silhouette and one small emissive point.**

- **Silhouette first**, because the emissive point alone would be colour-only and would disappear
  against era ten's lit town. **A low, wide, multi-legged chassis** is the right read: it is
  unmistakably not a person and not a vehicle, and it holds at the fixed camera.
- **One emissive sensor point**, small, in the era's accent. **It is the second channel, not the
  first**, and it is also what makes the stopped state legible (see below).
- **They move on a step the player takes**, never on their own. Position changes when the player
  advances, and only then.
- **They walk toward the nearest powered thing**, and **the board does not draw a route ahead of
  them**, which is what keeps era ten off era three's structure. What it draws is which powered
  building each one is currently walking to, as a **marker ring at that building's threshold**.

**The stopped state closes the era's own loop.** A robot with nothing lit to walk to **stops, and its
own sensor point goes out.** The player wins by turning things off, including the machines. That is
the era's inversion delivered in one image and it costs nothing beyond a material change.

### 3.4 The grid

**Era ten's crisis needs a power network with switchable state**, which no crisis has today.
Presentationally it is:

- **Districts**, each a set of buildings and the deck seams between them.
- **A district's switch** is drawn at its own **feeder cabinet**, a clad box on the deck with its own
  lever, larger than a building's isolator and using the same vocabulary.
- **The seams between the buildings in a district go dark with it**, which is the biggest visible
  consequence and is what makes switching a district feel different from switching a building.

**The grid is not drawn as lines.** Era six's crisis owns drawn links in the floor and era seven's
owns raised runs. **Era ten's connection is expressed by what goes dark together**, which needs no
edge layer at all and keeps three crises apart.

---

## 4. The player's own mark

**This is the one buildable light mechanic in the folder, and switching a building off is the only
building-state change in these nine briefs that needs no new geometry.**

Everywhere else in this folder the rule is that nothing tints a building at runtime, so every state
is added geometry. **Era ten's is different because it is subtractive and because it acts on
emissive rather than on body colour.**

> `PlacedBuilding.reviveMaterial` already walks a GLB's material graph and lifts
> `emissiveIntensity` to 1.2 wherever the export left an emissive non-zero. **Powering a building
> down is that same walk, setting it to zero.** It is a material change on existing geometry, which
> is one of the six permitted asset kinds, and the code that would do it already exists in the shape
> it needs to be.

**This is worth knowing before the build order is chosen**, because it means era ten's central
mechanic is cheaper to render than era five's fire, era three's raiders or era eight's schedule.

**The caveat, and it is why section 3.2 has a second channel:** a building whose trim is off is a
dark mass on a dark deck. **The isolator lever and the hazard chevron plate are what keep it on the
board.**

### 4.1 The three rungs

Accuracy sizes the action and never decides whether it happens. Era ten's cadence plans several
changes and then resolves them, so **what a batch sizes is how much of the grid the player may
reconfigure this turn**:

| Rung | What may be changed |
| --- | --- |
| **1 right** | One building |
| **2 right** | Two buildings, or one district |
| **3 right** | Three buildings, or one district and one building |

**The bottom rung still reconfigures something**, which is era ten's version of the invariant: the
plan happens, it is small.

**Whether this is what accuracy sizes is [Q1](#13-open-questions)**, since the ruling fixes the
cadence and not the scaling.

### 4.2 The switching beat

**A switch takes effect immediately, at the moment of commitment.** The trim goes out, the lever
drops, the chevron plate rises, the seams go dark. **Then the player advances and the robots move.**

**That ordering matters.** Era ten's whole decision is a prediction about where things will walk, so
the world must be in its new state before the prediction is tested.

---

## 5. The crisis surface

### 5.1 The finding: "watch it simulate" against the clockless rule

**The ruled cadence for era ten is *"planning phase, alter the grid, then watch it simulate"*, and a
simulation that plays on a timer is a clock.** INV-CRISIS-1 forbids anything that advances with
elapsed time, and it is asserted by two derived-population sweeps.

**The resolution this brief draws, and it belongs to the lead** ([Q2](#13-open-questions)):

> **The resolution is stepped, and the player takes each step.** A **Step** control advances every
> robot one cell. The player presses it as many times as the turn has steps, watching what their
> plan does, at their own pace.
>
> **"Watch it simulate" survives intact**, because the player is watching the consequences of a plan
> they have already committed and can no longer change. What they control is the pacing, not the
> outcome. **What is removed is the wall clock**, which was never the interesting part of the
> sentence.

**The alternative, recorded so it is not rediscovered:** an auto-playing resolution with a fixed
number of frames per step. It reads better and it is a clock, and the sweeps that assert clocklessness
are population-derived, so a new module would be swept the moment it is added to the population.

### 5.2 The two modes

| Mode | What the player is doing | What the rail shows |
| --- | --- | --- |
| **Planning** | Choosing what to switch, seeing what goes dark | The grid list, the action cards, the read-out panel, the commit control |
| **Resolving** | Stepping the robots forward | The step control, a step counter, and a running list of what each robot did. **No action cards at all** |

**The action cards are absent in resolving mode, not disabled.** The plan is committed and the player
is watching; a row of greyed cards would suggest they had failed to do something.

### 5.3 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.**

Rail order in planning mode:

1. **Header**: the crisis name, and **how much of the city is lit**, as a count of powered buildings
   against the total. **Not a percentage bar.**
2. **The grid list**: districts, each expandable to its buildings, each with its power state.
3. **The action cards.**
4. **The read-out panel.**
5. **The commit control**, then the control that moves to resolving.

### 5.4 At 460

Single column, **board first**, cropped to the robots and the lit buildings nearest them.

**The grid list collapses to districts only**, with buildings behind a disclosure. **Era ten has the
most objects of any crisis in this folder** (936 cells at its authored radius, and the largest
building set of the ten), so the narrow width needs the strongest filtering.

**The lit count never collapses.** It is the terminal condition in one number.

### 5.5 The hierarchy

**The island is the subject and it is doing double duty**, as the atmosphere and as the board. Era
ten is the only crisis in the folder where the two are the same thing, and the rail should be as
small as it can be.

---

## 6. The option cards

### 6.1 The actions

| Action | Kind of answer | Glyph |
| --- | --- | --- |
| **Switch a building off** | **The denial answer**, at the smallest grain | A building outline with its trim line broken |
| **Switch a district off** | The same answer at the coarse grain, and cheaper per building | A group outline with its seam broken |
| **Switch something back on** | The inverse, and era ten's real decision: **when to give the city back** | The outline with the trim line closing |

**All three are ruled by implication**, because the ritual is *reconfigure*, which is not a one-way
verb. **The third is the interesting one:** a player who switches everything off has solved the
crisis at the maximum price, and switching back on early is how they pay less.

### 6.2 The card

428 units wide, about 104 tall.

- **A 40 unit glyph** on the left. **The three glyphs are one family**, since they are three
  operations on one grid.
- **The name**, the target, and **what goes dark with it** at 13 units: for a district, the count of
  buildings.
- **A cost zone** carrying **what this suspends**, by name: *"The Signal Tower goes dark. Happiness
  down 9 while it is off."*

**The cost zone is era ten's most important card element**, because the whole crisis is a price paid
in the city's own function, and the player must be able to compare prices at a glance.

### 6.3 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2, card lifts 1, **no colour change**, and **everything that would go dark raises on the board**: the building or the whole district, with its seams |
| **Armed** | 3-unit border, corner flag with a check glyph, **Chosen**, `aria-pressed="true"` |
| **Unavailable** | **The reason replaces the ladder**: *"Already off."* `disabled`, `aria-describedby` |
| **Committed** | 6-unit diagonal hatch, declared line replacing the body |

---

## 7. The read-out panel

### 7.1 What it is for

The player has armed a switch. **The question is "where will they go instead, and what does this cost
me while it is off?"**

### 7.2 The direction

- **Lead with where the robots go instead.** That is the denial axis and it is the reason for the
  action. **This is the closest thing in era ten to era three's rerouted-path preview**, and it is
  different in kind: era three reroutes a path, era ten changes a destination.
- **Then the cost**, by name and by capacity.
- **Then whether anything is now trapped.** A robot with nothing lit in reach is stopped, which is a
  terminal condition, so a switch that strands one is progress and the panel should say so.
- **Show it as a small plan** of the robots and the lit set, with the armed change applied.
- **Say when it changes nothing.** If a robot has another lit building just as close, that is the
  finding: *"It walks to the Rail Deck instead, which is the same distance."*
- **No dashed borders.**

### 7.3 The provisional register

**A proposed switch is drawn as an outline**, not as a change: the building's trim stays lit and gains
a **raised outline of the hazard chevron plate** beside it, and the seams that would go dark are
**outlined rather than darkened**. **Nothing goes dark until it is committed**, because darkness is
the crisis's committed state and a provisional darkness would be indistinguishable from a real one.

**This is the sharpest provisional-versus-committed distinction in the folder**, and it is the one
most likely to be got wrong, because previewing a switch by simply dimming the thing would seem
obvious and would make the board unreadable.

---

## 8. Damage and consequence

### 8.1 What a dark building costs

**Switching a building off is the most literal possible instance of *"buildings become temporarily
unusable"***, which is a named permitted consequence, and **it is player-initiated**, so it is a
sacrifice chosen rather than damage done.

| Stage | What is drawn | Channels |
| --- | --- | --- |
| **Powered** | Trim lit, isolator lever up | Emissive, lever |
| **Dark** | **Trim at zero**, isolator lever down, **hazard chevron plate** standing beside it | Absence of emissive, lever, plate |
| **Back on** | Trim lit, lever up, plate gone | Emissive returning |

**Capacity is suspended while a building is dark and it returns when the power does.** Era ten's
suspension is like era six's in that it lifts on its own, and unlike era six's in that **the player
chooses when**, by switching back on.

### 8.2 What a robot does when it reaches a lit building

**It stops there and the building goes down.** The building is **damaged, not destroyed**: it becomes
a **ruin stage** through the shipped path, at the same cell, still a click target, still carrying its
lesson. **`crisis-damage.ts` has no field that could record a removal.**

**Era ten's ruin should read as a modern structure taken apart rather than knocked down**: panels
pulled off the frame, conduit hanging, the frame still standing. **That is a distinct template from
era five's charred posts and era eight's tilted slabs**, and it is worth authoring separately, so the
run's three ruin families each say what happened.

### 8.3 The two endings

| Ending | What it costs | What it looks like |
| --- | --- | --- |
| **Every robot stopped, city still lit** | Whatever was switched off, whatever was reached | The trim comes back district by district |
| **The city is dark** | **Everything is suspended at once**, and it all comes back | The town dark and still, robots stopped in it, then the lights returning |

**The second is a solved crisis at the maximum price and the copy must say so.** It is not a loss and
it must not be written as one.

### 8.4 The floor

Nothing is removed, no node is relocked, no mastery is touched. Every consequence lands in
`ruined_buildings`, `ruined_cells` or `suspended_civic`.

---

## 9. The copy

**Register: results, not purchase.** Era ten's exposure runs through the reconfiguration budget:
*"three correct answers buys three switches"* is the sentence to avoid.

- **Right:** *"3 right. You can change three things this turn."*
- **Wrong:** *"3 right. That buys you three switches."*
- **Right, and a real cost:** *"Happiness down 9 while it is off."*

**The hardest copy problem in this brief is the dark ending**, and it is a register problem rather
than a wording one. **A city switched fully off is a solved crisis at maximum price.** The copy must
say what happened and what it costs, and it must not congratulate and must not console.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Uprising** |
| Entry announcement, heading | **The machines are out** |
| Entry announcement, body | They walk toward whatever is powered. You can go up to the deck when you are ready. |
| Entry announcement, control | **Go up to the deck** |
| Header | **{n} of {m} buildings still on** |
| Board label | The island. What is powered, and what is walking toward it. |
| Grid list heading | **The grid** |
| Grid list row | Harbour district. Four buildings, all on. |
| Declare heading | **Choose what to switch** |
| Declare body | Pick a building or a district, then answer {n} questions. How many you get right sets how much you can change this turn. |
| Commit control | **Throw the switch** |
| Move to resolving | **Let them move** |
| Step control | **Step** |
| Step counter | Step {i} of {n} |

### 9.2 The cards

| Line | String |
| --- | --- |
| Switch off, name | **Switch off the Signal Tower** |
| Switch off, body | Nothing there for them to walk to. |
| Switch off, cost | The Signal Tower goes dark. Happiness down 9 while it is off. |
| District off, name | **Switch off the harbour district** |
| District off, body | Four buildings and the seams between them. |
| District off, cost | Happiness down 22 while it is off. |
| Switch on, name | **Switch the Signal Tower back on** |
| Switch on, body | Its happiness comes back, and so does the reason to walk there. |
| Ladder rung 1 | 1 right: change one building |
| Ladder rung 2 | 2 right: two buildings, or one district |
| Ladder rung 3 | 3 right: three buildings, or a district and a building |
| Unavailable | Already off. |
| Armed | **Chosen** |
| Committed | Switching. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **Switching off the Signal Tower** |
| Where they go instead | The one on the west deck walks to the Rail Deck instead. |
| Trapped | The one by the pontoon has nothing left in reach. It stops. |
| The cost | Happiness down 9 while it is off. |
| Changes nothing | The Rail Deck is the same distance. It walks there instead and nothing is gained. |
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
| Last question | **See what you can change** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Three right | 3 right. You can change three things this turn. |
| Two right | 2 right. You can change two things, or one district. |
| One right | 1 right. You can change one thing. |
| None | 0 right. Nothing changes this turn. |
| Step, walked | It moved two decks west, toward the Rail Deck. |
| Step, stopped | It has nothing to walk to. It has stopped. |
| Step, reached | It reached the Rail Deck. The building is down and it can be rebuilt. |
| Ended, lit | **They have all stopped.** The city is still on and you can put the rest back. |
| Ended, dark | **The city is dark and they have stopped.** Everything comes back on now. |

**On the dark ending.** It states two facts and then says what happens next. **It does not say "you
survived", it does not say "at least", and it does not say the city is safe.** Switching the city off
was the answer, and the line reads as the answer landing.

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.** **Era ten needs this more than
its emissive board suggests**, because a crisis whose primary channel is light is the hardest
possible one to convey without sight.

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Building powered | emissive trim | **Isolator lever up**, and the grid list row |
| Building dark | absence of emissive | **Isolator lever down**, **hazard chevron plate**, grid list row |
| District dark | absence of emissive on the seams | **Feeder cabinet lever down**, and every building's lever down, plus the grid list |
| Robot walking to a building | emissive marker ring | **Raised marker ring geometry** at the threshold, plus the robot's own facing, plus the rail |
| Robot stopped | its sensor point goes out | **A distinct posed stance**, plus the step log line |
| Proposed switch | outline | **Outline of the chevron plate**, seams outlined rather than darkened |
| Building ruined | none | **Silhouette change: panels off the frame, conduit hanging**, status line |
| Card armed / unavailable / committed | border | Corner flag; reason text; diagonal hatch |

**The isolator lever is doing more work in this brief than any other single object in the folder.**
It is the non-colour carrier for the crisis's entire central state, and without it era ten's board is
readable only by people who can see the lights.

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Building, powered | `The Signal Tower. On. One machine is walking toward it, three decks away.` |
| Building, dark | `The Signal Tower. Off. Its happiness is suspended while it is off.` |
| District | `Harbour district. Four buildings, all on.` |
| District, dark | `Harbour district. Four buildings, all off.` |
| Robot | `A machine on the west deck, three steps from the Signal Tower.` |
| Robot, stopped | `A machine by the pontoon. Stopped, with nothing in reach.` |
| Switch card | `Switch off the Signal Tower. Nothing there for them to walk to. Happiness down 9 while it is off. One correct answer changes one building.` |
| Header | `Nine of fourteen buildings still on.` |
| Step control | `Step. Two machines still moving.` |
| Ruined building | `The Rail Deck. Taken apart. It can be rebuilt for {n} material.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **What is lit is the entire board and it is carried by light.** Every building's accessible name
  must state its power state, and the header must carry the count. **This is the single most
  important accessibility requirement in this brief.**
- **Which building each robot is walking toward** is carried by a marker ring and by the robot's
  facing. It must be in the robot's own name and in the read-out panel.
- **The stepped resolution changes several things per step.** Each step gets a polite live region
  with one line per robot, which is what section 9.5's step lines are for.
- **A trapped robot is a terminal condition** and its announcement should be unmistakable.

---

## 11. The consolidated asset list

**22 items.** No entry is a bitmap. **Era ten has the smallest geometry list of the nine relative to
its board size**, because its central mechanic is a material change rather than a model.

### Atmosphere (6)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Uprising lighting preset: nine numbers, key and ambient well down so the trim carries | Treatment |
| A2 | Sky and fog preset: near black, cold, fog pulled in | Treatment |
| A3 | Camera and sensor clusters turned one way | Treatment, on existing props |
| A4 | Empty drone docks: cradles open, lockers shut | Treatment, on existing props |
| A5 | Alert signage proportion: more dead, more flickering | Treatment, on existing props |
| A6 | Island clip for the ground layer, so cells past radius 30 are not drawn | Treatment |

### The grid (6)

| # | Item | Kind |
| --- | --- | --- |
| G1 | **The power-down material pass: `reviveMaterial` run in reverse, emissive to zero.** The crisis's central mechanic and it needs no geometry | Material |
| G2 | **Isolator lever at a building's base, up and down.** The non-colour carrier for the whole board | Geometry x2 |
| G3 | **Hazard chevron plate**, standing beside a thrown isolator | Geometry |
| G4 | Feeder cabinet with its own lever, for a district | Geometry x2 |
| G5 | Switchable deck seams: emissive banding let into the deck, lit and dark | Geometry + material |
| G6 | Proposed-switch outlines: chevron outline, seam outline | Geometry |

### The robots (5)

| # | Item | Kind |
| --- | --- | --- |
| R1 | **Robot chassis: low, wide, multi-legged, with one small emissive sensor point** | Geometry + material |
| R2 | Robot advance interpolation, one cell per step, and its posed still | Animation rig |
| R3 | Stopped pose, with the sensor point out | Geometry + material |
| R4 | Marker ring at a targeted building's threshold | Geometry |
| R5 | Era ten ruin template: panels off the frame, conduit hanging, frame standing | Geometry, per footprint |

### The UI (5)

| # | Item | Kind |
| --- | --- | --- |
| U1 | **The grid list**: districts with buildings behind a disclosure, full and collapsed | DOM |
| U2 | Action card with its capacity cost zone and five states | DOM |
| U3 | Action glyphs: off, district off, back on, as one family | SVG x3 |
| U4 | **The step control and the step log**, which is the resolving mode's whole rail | DOM |
| U5 | Read-out panel: where they go instead, what is trapped, and the cost | DOM + SVG |

**Counts by kind:** 11 geometry items or sets, 5 materials, 1 animation rig, 2 SVG sets, 5 DOM
designs, 6 treatments. **Build G1 and G2 first.** The power-down pass is the crisis and it is nearly
free; the isolator lever is what stops it being invisible.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

**Era ten's list is the most interesting of the nine, because its central mechanic is buildable and
its era identity is not.**

1. **Reflections: the wet deck carrying the signage down onto the floor, and the water carrying
   reflected signage.** Era ten's own guide calls this *"the one era in the run where the ground's
   legibility is solved by light"*, and **there is no environment map and no reflection path.**
   Section 2.2's substitute is emissive banding set into the deck, which the guide also specifies, so
   the era can be built from its own second answer rather than from a compromise.
2. **Bloom.** A neon city without bloom is flat bright rectangles. `@react-three/postprocessing` is
   not a dependency, so this is a package decision affecting every surface in the game.
3. **Any light falling on anything.** A lit gantry under the deck, a sign washing the wall behind it,
   a robot's sensor point catching the deck: all unbuildable. **Era ten's guide already accepts
   this** and calls its light ornament rather than lighting, which is why the era survives the
   limitation better than era nine does.
4. **Rain, and wet surfaces that read as wet.** Era ten's deck is *"wet almost everywhere"* and
   wetness is a specular property. **A dark faceted deck with dark flat puddle patches is the
   substitute** and it is noticeably less than the guide describes.
5. **A per-cell ground layer at era ten's authored radius. This is the largest gap in the ten:** 936
   cells at radius 69, against a drawn grass radius of 30 and a lagoon radius of 58.
6. **Mobile agents with pathing**, which era ten shares with era three and which no crisis has today.
   It is a real build rather than an impossibility, and it is the biggest single engineering item in
   either brief.
7. **An auto-playing resolution.** Buildable and **ruled out on clocklessness grounds**, per section
   5.1.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **What does accuracy size?** Section 4.1 draws it as how much of the grid may be reconfigured this turn. | Team lead | It is the ladder, the card copy and the read-out panel |
| **Q2** | **Is the resolution stepped by the player, or does it play?** Section 5.1 works both through and draws the stepped version, because an auto-playing simulation is a clock and INV-CRISIS-1 is asserted by two sweeps. **This is the most consequential open question in this brief.** | Team lead | It is the whole resolving mode: a step control and a log, or a playback with no controls |
| **Q3** | **Do robots target the nearest lit building, or the most valuable one?** Section 3.3 draws nearest, which is legible from the board. A value-seeking rule would make the read-out panel much harder and the crisis much deeper. | Team lead | It decides whether the marker ring is predictable from the board or has to be explained in the rail |
| **Q4** | **How is a district defined?** Section 3.4 assumes authored districts with feeder cabinets. | Whoever authors era ten's land | It decides whether G4 exists and whether the grid list has two levels |
| **Q5** | **Can a stopped robot restart if the player switches something back on?** Section 6.1's third card makes this the interesting decision, and it is not ruled. | Team lead | It decides whether stopping is terminal per robot, and therefore whether the terminal condition can be undone |
| **Q6** | **What does "destroyed" mean in the terminal condition?** D-CRISIS-11 says the crisis ends when every robot is *"trapped or destroyed"*, and nothing in the design gives the player a way to destroy one. | Team lead | If destruction is possible there is a fourth action card and a whole verb this brief does not draw |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-23 (the inversion, and that
  a dark city is an ending with consequences), D-CRISIS-11 (the terminal condition), D-CRISIS-9 and
  D-CRISIS-24 (the trigger, and era ten as one of two eras that does not fire at three), section 7's
  floor check, section 9's capability list including mobile agents and the switchable power network,
  and INV-CRISIS-1, 3, 4, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, copy rules and
  per-era decal reach
- `docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md`: the emissive edge as ornament rather
  than lighting, the deck and its three defining properties, the road as ground plus light, and the
  props kit
- `apps/web/src/city/three/PlacedBuilding.tsx`: `reviveMaterial`, which the power-down pass is the
  inverse of
- `apps/web/src/city/three/MasteryStars.tsx`: emissive at 1.35, the brightest face the city ships
- `apps/web/src/city/three/ruinStage.ts`: the stage-swap seam era ten's ruin template joins
- `test/hardWinterClockless.test.ts` and `packages/economy/src/clockless.test.ts`: the two
  derived-population sweeps that make section 5.1 a real constraint rather than a caution
- `engines/game/src/crisis-damage.ts`: the type with no field for a removal
- #298: era ten's buildable radius of 69
  and its 936 cells
- #302: era one's brief
