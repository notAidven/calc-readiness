# The Intrusion: design and asset brief

**Era:** 9, Information
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era nine's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

**Era nine inverts the preview discipline** and section 7 is written around that: every other crisis
lets the player see the board and hides the score, and this one hides the board.

---

## 0. The hard boundary

**Read `./README.md` first.** Era nine collides with one item harder than any other era in the run:

1. **There is no environment map, so nothing can be glassy.** **Era nine's entire signature move is
   *"the sealed reflective skin"***, and its own guide specifies buildings that show *"a reflection
   of the sky and the next building along"*. **That is not renderable.** `metalness` is 0 across the
   island by convention and there is nothing to reflect. **Era nine's glass is pale, faceted and
   flat-shaded**, which is how its buildings will be authored regardless of this crisis. Section 12
   records it because the crisis inherits the limitation rather than causing it.
2. **Nothing tints a building at runtime.** A compromised building cannot be drawn by shifting its
   colour. It is marked with **added geometry**, per section 3.
3. **No image textures.** No screen content as a bitmap, no printed graphics, no wayfinding artwork.
   Era nine's display panels are geometry with an emissive face and, where they need to show
   something, a procedurally drawn `CanvasTexture` in the same way the island's tile grid is drawn.
4. **Emissive is a bright face and lights nothing.** Era nine's uplighters, its lit panels and its
   lit signage all work as **bright faces**, which is fine, and **none of them illuminates the
   ground, the wall behind them, or anything else.**

**The one piece of good news, and era nine gets more from it than any other era:** a bright emissive
face at up to about 1.35 is shipped precedent, and **era nine's tally descendant is a small
illuminated matrix panel.** The crisis's whole readout system is therefore made of exactly the thing
this renderer draws well.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading;
**emissive as a bright face, which era nine leans on more than any other era**; a procedurally drawn
`CanvasTexture`, which is the only texture path and which is how a panel gets a legible readout;
`useFrame` animation gated on `prefers-reduced-motion`; the shared ground-decal ladder; and the nine
lighting numbers plus sky and fog.

---

## 1. The crisis, and what the player does

**The premise, in one line.** Something is in the town's systems, you cannot see which buildings it
has reached, and finding out costs you.

**The ritual: I choose diagnostic questions.** Era nine is the only crisis of the ten where the
player spends on **finding out** rather than on **doing**. Every other crisis converts a right answer
into an effect on the board. Here it converts into **the quality of a reading**.

**The cadence: choose an investigation, then answer to set the quality of the information.** Shared
with era two, and they are seven eras apart, which is the safest placement a shared cadence has in
this design. Section 1.1 covers the separation, which is a ruled one.

**Duration: solve it.** It ends when **the source is isolated**. It also ends when the **diagnostic
budget** is spent, and then it ends **unsolved with the damage standing**. **Era nine is the only one
of the three solve-it crises that gains a budget it did not already have.**

**The stake: a wrong isolation costs the clean building's capacity and the source relocates.** You
lose two things at once, and the pairing is the ruling: the building's **function** goes, and your
accumulated **evidence goes stale**. Either alone would be a fine you could absorb. Together they
mean a wrong isolation leaves you **further from the answer than before you acted**.

**The consequence to state plainly: acting early is how you lose.** Era nine is the only crisis of
the ten where the characteristic mistake is impatience rather than misallocation.

**Entry.** After `ceil(n / 2)` of era nine's six nodes (`EL.1` to `EL.6`), which is **three**.

### 1.1 Era nine against era two, which is a ruled separation

**D-CRISIS-22 protects era nine's partial credit: a weak answer returns *"likely compromised"* rather
than nothing, and it is the only place in the run where being partly right gives something partly
useful.** Everywhere else partial correctness returns a smaller effect, and at the bottom of the
ladder a smaller effect does nothing at all: era one's fire at the bottom rung is lit and wards
nobody.

| | Era two | Era nine |
| --- | --- | --- |
| What is hidden | **Where a thing is** | **What a known thing's status is** |
| What accuracy sizes | **How much ground the party covered** | **How certain the reading is** |
| A weak result | A definite answer about a small area | **A hedged answer about the thing you asked about** |
| Why it is useful | It rules ground out | **Degraded information narrows a search** |

**The two are different machinery**, and the crisis spec says so: era two hides a location and era
nine hides a status, and they should not be scoped as one system.

### 1.2 The preview inversion, which shapes the whole surface

**INV-CRISIS-10 guarantees that a player can always see what an action would do before committing.
Era nine's axis is that the player cannot see the board.** Those are different unknowns and the
crisis spec is explicit that they must not be confused:

> **The cost of an action must still be legible even when its target is not.**

**So era nine's read-out panel is unlike every other one in this folder.** It cannot show what a
reading will find, because that is the thing being hidden. **It shows what the reading will cost,
what it will cover, and how good it will be**, and section 7 is built on that distinction.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell something is wrong.

**This is the hardest atmosphere brief of the nine**, and it is hard for a specific and interesting
reason: **era nine's crisis is invisible by design.** Nothing burns, nothing arrives, nothing falls
over. The town is exactly as immaculate as it was.

**The answer, and it is one object:** era nine's guide says the inspection covers are *"part of the
pattern rather than apologised for"*, squared to the module and aligned to the joints. **So lifting
them breaks the pattern, and for the era whose whole identity is a sealed unbroken surface, a floor
with its covers up is the loudest possible statement.**

**The constraint:** era nine's floor in the ground ladder is **engineered paving on structure**:
precise unit paving over podiums and service voids, tactile paving, inspection covers, flush
drainage channels, level changes by ramp. **None of that changes**, and the crisis is drawn by
opening it.

### 2.1 The light

**The direction: late, flat and colourless, with the town's own panels the only live things in the
frame.**

**Why not night.** A dark scene would make era nine's lit panels look wonderful and it would be a lie:
**those panels light nothing**, so a night scene would have bright rectangles floating in blackness
with no falloff anywhere, which reads as broken rather than as atmospheric. **A dimmed, flat, late
afternoon keeps the town readable and still lets the emissive panels be the brightest thing.**

| Lever | Era nine's day preset today | Intrusion direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Neutral grey.** Era nine's palette is anodised grey-blue and warmth is foreign to it |
| Key intensity | 1.32 | **Down substantially**, so the emissive panels have something to be brighter than |
| Key angle | Low and raking | Low and flat. Long soft shadows across a precise floor |
| Hemisphere sky | `#CFE6F6` | Cooler, dimmer |
| Hemisphere ground | `#C08F57` warm earth | **Cool pale stone**, which is what era nine's paving actually is |
| Hemisphere intensity | 0.95 | Down |
| Ambient | `#F5EFE2` at 0.30 | Down and cold |
| Rim | `#BFDCEF` at 0.48 | **Keep.** Era nine's buildings are flat sealed planes and the rim is the only thing separating one from the next |
| Background (sky) | `#BFE1F2` clear blue | **A flat cool grey, slightly darker than the other briefs' skies.** No horizon warmth |
| Fog colour | `#D6ECF7` | Match |
| Fog near and far | `radius x 3` to `radius x 20` | Pull the far plane in a little. **Era nine wants the town legible and the world beyond it indistinct**, which is the era's own premise about buried machinery |

### 2.2 Ground

**The ground is where this crisis lives.** Two changes and both are era nine's own vocabulary.

- **The covers are up.** Inspection covers lifted and leaning, service voids open, **temporary
  barriers around each opening** in era nine's own matched-enclosure language. **A precise banded
  pattern with holes in it is the crisis, and it is one prop repeated.**
- **The duct and fibre markers read.** Era nine's kit has *"flush duct and fibre markers"* set into
  the paving, and the crisis makes them the trace: **the markers along the routes the intrusion has
  been found on carry a raised collar**, which is the closest era nine gets to a visible network.

**Note what this is not.** These are not links in era six's sense, and era nine has no edge layer:
they are marks on the ground that say where evidence was found. **Era nine's hidden state is per
building, not per connection**, and drawing a network would import era six's topology into a crisis
that does not have one.

**The reach question.** Under #298 era
nine's buildable radius is **65**, past the drawn grass at 30 and past the lagoon at 58. **The ground
layer must clip to the drawn island.**

### 2.3 Vegetation

**Era nine's planting is engineered and it stays exactly as it is:** multi-stem trees in flush
grilles, grasses in drifts, sedum on a podium top.

**No change at all**, and that is deliberate. Era nine's crisis is a systems failure inside a town
that is still being maintained perfectly, and a wilting plant would tell the wrong story.

### 2.4 Water and shoreline

**No change.** Era nine's shoreline is engineered and the intrusion is not physical.

**One exception, and it is the era's best joke on itself:** era nine's props kit carries **a pavilion
that is really a pump house**, described as *"a small clad box with a glazed face and no door on the
side you can see, which is the era's habit in miniature"*. **In the crisis its door is open**, on the
side you can now see. The era that hides its machinery has had to open it up.

### 2.5 Signs of habitation at the margins

**A town that is fine and is not fine**, from era nine's own kit:

- **The cycle docks are full.** A complete rank, every stand taken, nobody riding.
- **The display panels are all showing something.** Era nine's tally descendant is on every door, on
  totems and above counters, and in the crisis **every one of them is a status readout**, which is
  section 3.2's whole system.
- **Rooftop plant running.** Chillers in ranks and louvred screens: the machinery is still working,
  which is the point.
- **Matched enclosures opened.** The recycling and servicing enclosures with their hinged lids up.
- **Wayfinding totems dark.** One class of panel that is **not** lit, which is a small anomaly in a
  town where everything else is.

### 2.6 Does anything move

**Almost nothing, and what does is data.**

- **The display panels change.** Era nine's guide describes the panel as *"showing a number that
  changes"*, and in the crisis a panel's readout updates when the player learns something. **It
  changes on a player action and never on its own**, which is both the clockless rule and the more
  useful behaviour.
- **The rooftop chillers turn**, slowly. The one mechanical motion.
- **Nothing else moves.** No people, no vehicles.
- **Every animation is gated on `prefers-reduced-motion`**, and a panel holds its posed readout.
- **Nothing that moves may advance the encounter.**

### 2.7 The transition, in and out

**In:** the lighting numbers, the flat grey sky, **the covers coming up across the town**, the
barriers going round them, the status panels going from their ordinary readouts to blank diagnostic
ones, the pump-house door opening.

**What never changes:** the buildings, the paving pattern itself, the planting, the island's
geometry, the shoreline.

**Out:** the covers go back down and the pattern closes. **That is era nine's exit and it is a good
one**, because the whole crisis was a broken pattern and the ending is the pattern restored.

**If it ends unsolved**, some covers stay up, and the buildings whose capacity is suspended keep
their shutters. **The pattern stays broken where the player did not finish**, which is legible from
any zoom without a panel.

### 2.8 The read, in one sentence

*The same immaculate sealed town late in the day with its floor open in a dozen places, barriers
round every opening, and a lit panel by every door showing something nobody wants to read.*

---

## 3. The hazard

### 3.1 The four questions the board must answer

1. **Which buildings have been read, and which have not?** **Unknown must be a positive state**, or
   the board looks empty rather than uncertain.
2. **What did each reading say?** Three grades, per 3.3.
3. **How old is each reading?** Because a wrong isolation makes them all stale, and a stale reading
   is worse than no reading if the player forgets it is stale.
4. **How much diagnostic budget is left?**

### 3.2 The status panel, which is the crisis's whole instrument

**Era nine's tally descendant is a small illuminated matrix panel by a door**, and the crisis takes
it wholesale. **Every building carries one for the duration.**

- **It is geometry with an emissive face**, at around 1.0 to 1.35, which is shipped precedent.
- **Its content is a procedurally drawn `CanvasTexture`**, which is the only texture path in this
  renderer and is exactly how the island's tile grid is already made. **This is the one place in the
  nine briefs where a texture is the right answer**, and it is a drawn one rather than a bitmap.
- **It reads at the game's zoom because it is a small bright rectangle against a dim flat wall**,
  which is the single thing emissive does well here.

### 3.3 The four readings, and none of them is colour

| Reading | On the panel | Second channel | Third channel |
| --- | --- | --- | --- |
| **Unread** | **A blank matrix**, lit but empty | No collar on the building's duct marker | The rail lists it as unread |
| **Clear** | **One segment lit**, at the left | A **flush collar** on its duct marker | Rail text |
| **Likely compromised** | **Two segments lit**, with the second **half height** | A **raised collar**, single | Rail text |
| **Compromised** | **Three segments lit**, full height | A **raised collar, doubled** | Rail text |

**The segment count is the primary read and it is countable**, which is what INV-CRISIS-16 wants: one,
two or three, at a glance, in greyscale, at any zoom where the panel is visible at all. **The half
height on the middle reading is what makes "likely" read as hedged** without needing a word.

**The duct-marker collar is the zoomed-out channel.** A panel by a door disappears at full zoom-out;
a collar on a ground marker does not. **Two carriers at two distances** is what makes this board
readable at both.

### 3.4 The stale reading, which is the crisis's sharpest moment

**When a wrong isolation relocates the source, every reading goes stale.** The board must show that
without simply deleting what the player learned, because *"you knew this and it no longer counts"* is
the experience the ruling is about.

| Element | Before | After a relocation |
| --- | --- | --- |
| **The panel** | Segments lit | **The same segments, with a bar drawn under them** and the panel's emissive dropped to about half. It still shows what it showed |
| **The duct collar** | Raised | **Raised, with a cut notch across it** |
| **The rail** | *"Compromised."* | *"Compromised, read before the last isolation."* |

**Keeping the old reading visible and marking it stale is better than blanking it**, for two reasons.
It is more informative: the player can reason about what has changed. And it is more honest about
what the mechanic did, which is the register this whole design is written in.

### 3.5 The source, which is never drawn

**There is no visible intruder in this crisis.** No agent, no marker, no trail, no icon. The source
is a fact about a building's status and the only way to learn it is to read a panel.

**This is worth stating as a rule** because the temptation to draw something is strong, and anything
drawn would either give the answer away or be decorative. **The board's entire content is what the
player has learned.**

---

## 4. The player's own mark

**Era nine's player has two verbs and they are asymmetric**, which is the crisis.

### 4.1 The diagnostic

**Lifting a cover and reading what is under it.** The mark of a completed diagnostic is:

- **The cover lifted and leaning**, with its barrier round the opening.
- **The building's panel showing a reading.**
- **A collar on its duct marker.**

**The cover stays up for the rest of the crisis**, which turns the floor into a record of everywhere
the player has looked. **This is the same job era two's searched-ground course does**, in era nine's
own material.

### 4.2 The three grades

Accuracy sizes the **quality of the reading**, which is D-CRISIS-22's protected mechanic:

| Rung | What comes back | On the panel |
| --- | --- | --- |
| **1 right** | **A hedged reading.** *"Likely compromised"* or *"probably clear"* | Two segments, the second half height |
| **2 right** | A firm reading on the building asked about | One or three segments |
| **3 right** | A firm reading **on the building asked about and one next to it** | Panels on both |

**The bottom rung returns something useful**, which is the point of the protection: *"likely
compromised"* narrows a search, where era one's null radius protects nobody. **Whether the top rung
widens rather than sharpens is [Q1](#13-open-questions)**, since the ruling protects the partial
credit and does not specify the top of the ladder.

### 4.3 The isolation

**The heavy verb, and the one that can go wrong.** Isolating a building:

- **Shutter plates** go up over its openings, in era nine's own material: **flush blanking panels in
  the curtain-wall module**, which is the era's sealed skin turned against itself.
- **A corner tag** at the front lower corner: era nine's is a **service isolation plate**, a small
  angled panel with a single cut bar.
- **Its status panel goes dark.** The one panel in the town that is not lit, which is the strongest
  possible statement in a town where everything else is.
- **Its capacity is suspended.**

**If it was the source, the crisis ends.** If it was not, the capacity is suspended anyway and every
reading goes stale.

### 4.4 The budget

**Era nine's budget is diagnostic actions**, and it is displayed in the era's own idiom: a **totem
panel** in the rail carrying a count in the same matrix style the building panels use.

**A budget so tight that ending unsolved is the ordinary result is a different game from one where it
is the price of impatience.** That is carried in the crisis spec as O-18 and it is
[Q2](#13-open-questions) here.

---

## 5. The crisis surface

### 5.1 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.**

Rail order:

1. **Header**: the crisis name, and **the budget** as a matrix count.
2. **The evidence board**: one row per building, with its reading, its grade, and whether it is
   stale. **This is era nine's central UI element** and it is the second view of every panel in the
   town.
3. **The action cards.**
4. **The read-out panel** when an action is armed.
5. **The commit control.**

**The evidence board is sorted by reading, not by name**, so the compromised and likely-compromised
entries sit together. **Sorting by name would bury the finding in a list.**

### 5.2 At 460

Single column, **board first**. The board crops to the buildings with readings, since an unread
building has nothing to look at.

**The evidence board collapses to a filtered list** showing everything except the clear entries, with
a control to show all. **Clear buildings are the majority and they are the least interesting rows.**

**The budget count never collapses.**

### 5.3 The hierarchy

**The evidence board is the subject and the island is the illustration.** Era nine is the one crisis
in this folder where that ordering is correct: the decision is made from a table of readings, and the
town is where those readings came from.

**This is a deliberate reversal of the other eight briefs** and it should be stated to whoever
implements it, because the shared rule in the folder's README puts the board first at 460 and era
nine keeps that only because the crop still carries useful information.

---

## 6. The option cards

### 6.1 The actions

| Action | Kind of answer | Glyph |
| --- | --- | --- |
| **Run a diagnostic** | **The information answer.** The crisis's axis | A lifted cover with a panel above it |
| **Isolate a building** | **The commitment answer.** Right, and it is over; wrong, and it costs twice | A building outline with a blanking panel across it |
| **Clear a building** | The undo, if the mechanic allows it: capacity comes back and the building rejoins | The same outline with the panel lifting |

**The third is not ruled** and is [Q3](#13-open-questions). Without it, a wrong isolation is permanent
for the rest of the crisis, which may be intended.

### 6.2 The card

428 units wide, about 104 tall.

- **A 40 unit glyph** on the left.
- **The action name**, the target building, and its current reading at 13 units.
- **A cost zone.** For a diagnostic it is **one diagnostic**. For an isolation it is
  **the building's capacity**, named: *"Suspends the Data Hall. Livability down 14."*

**The isolation card's cost zone is the most important cost zone in the folder**, because era nine's
whole design turns on the player weighing certainty against a price, and this is where the price is
written.

### 6.3 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2, card lifts 1, **no colour change**, and **the target building's panel raises on the board**, along with its duct marker |
| **Armed** | 3-unit border, corner flag with a check glyph, **Chosen**, `aria-pressed="true"` |
| **Unavailable** | **The reason replaces the ladder**: *"Already read since the last isolation."* `disabled`, `aria-describedby` |
| **Committed** | 6-unit diagonal hatch, declared line replacing the body |

### 6.4 The isolation confirmation

**Isolating is era nine's irreversible act and it warrants the same two-stage control era five's
demolition gets**, for the same reason and with the same shape: one control, two presses, the
consequence written on the second.

> **Isolate the Data Hall** becomes **Yes, isolate it. If this is wrong, the source moves and every
> reading goes old.**

**That second label is the whole ruling in one sentence** and it is the last thing the player reads
before finding out.

---

## 7. The read-out panel

### 7.1 The inversion, stated precisely

**Every other read-out panel in this folder shows what an action would do to the board.** Era nine's
cannot, because the board is what is hidden.

**What it shows instead:**

| It shows | It does not show |
| --- | --- |
| **What the action costs**, in diagnostics or in capacity | What the reading will say |
| **What it will cover**: this building, or this building and a neighbour | Whether the building is compromised |
| **How good the reading will be** at each rung | Anything about the source's location |
| **What is already known**, and how much of it is stale | |

**The crisis spec's requirement is met exactly:** *"The cost of an action must still be legible even
when its target is not."*

### 7.2 The direction

- **Lead with the cost**, which is the reverse of every other brief here and is correct for this one.
  For an isolation the cost is a capacity and a risk, and both belong at the top.
- **State the risk in full, every time, on every isolation.** *"If this is wrong, the source moves
  and every reading goes old."* **It is never softened and never omitted**, because acting early is
  how the player loses and they are entitled to know that before every attempt.
- **Show what is known as a summary**, not as a repetition of the evidence board: *"Four read, one
  compromised, two likely, one clear. Three of those were read before the last isolation."*
- **Show the ladder as reading quality**, not as effect size.
- **No dashed borders.**

### 7.3 The provisional register

**A proposed diagnostic is a raised outline of a cover**, not a lifted cover. **A proposed isolation
is an outline of the blanking panels**, not panels. As everywhere in this folder, provisional states
frame and committed states fill.

---

## 8. Damage and consequence

### 8.1 The suspended building

The shared **shutter plate**, in era nine's material:

| Stage | What is drawn | Channels |
| --- | --- | --- |
| **Normal** | The building as authored, with its lit status panel | Panel |
| **Isolated** | **Flush blanking panels in the curtain-wall module**, a **service isolation plate** at the corner, and **its status panel dark** | Silhouette change, corner plate, the dark panel |
| **Restored** | Panels off, status panel lit again | Absence, and the panel returning |

**The dark panel is era nine's most economical damage signal.** In a town where every building's
panel is lit, one that is not reads instantly and needs no legend.

### 8.2 What persists

| Thing | After |
| --- | --- |
| **Suspended capacity** on wrongly isolated buildings | **Persists**, and is restored by a repair action. Era nine's restore is **not ruled** and is [Q4](#13-open-questions) |
| **Lifted covers** | Go, unless the crisis ended unsolved |
| **Readings** | Go |
| **The source** | Removed when isolated |

### 8.3 The floor

A compromised or isolated building is *"temporarily unusable"*, which is a named permitted
consequence, and relocation moves hidden state rather than removing anything. Nothing is destroyed,
no node is relocked, and `crisis-damage.ts` has no field that could record a removal. **Era nine's
whole consequence lands in `suspended_civic`.**

### 8.4 Termination, which needs care

**If the source relocates on every wrong isolation, a player who keeps guessing keeps resetting the
board**, and D-CRISIS-11's boundedness claim needs an argument. **D-CRISIS-26's budget supplies it:**
a player can only guess as many times as the budget allows, and when it is spent the crisis ends
unsolved with the damage standing.

**Presentationally that means the budget is the most important number on the screen** and it must
never be more than one glance away.

---

## 9. The copy

**Register: results, not purchase.** Era nine is **the most exposed of the nine to the purchase
frame**, because its axis is literally described in the design as *"paying for information"*.

**The line to hold, and it is finer here than anywhere:**

- **A diagnostic is spent.** *"This takes one diagnostic. You have three."* Correct: the budget is a
  real finite resource.
- **Capacity is given up.** *"Suspends the Data Hall. Livability down 14."* Correct.
- **Answers are not currency.** *"Three correct answers buys a firm reading"* is wrong. **"3 right.
  A firm reading on the Data Hall, and on the Server Court next to it."** is right.

**Plainer language matters here more than anywhere.** Era nine's mechanic is the most abstract in the
ten, and its copy is the only place a player will learn what a reading means. **No jargon, no
security vocabulary, no "compromised nodes" and no "attack surface".**

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Intrusion** |
| Entry announcement, heading | **Something is in the systems** |
| Entry announcement, body | It is in one of the buildings and the panels do not agree about which. You can go and look when you are ready. |
| Entry announcement, control | **Go and look** |
| Header, budget | **{n} diagnostics left** |
| Board label | The island. Buildings, and what you know about each. |
| Evidence board heading | **What you know** |
| Evidence board row | The Data Hall. Compromised. |
| Evidence board row, stale | The Data Hall. Compromised, read before the last isolation. |
| Evidence board row, unread | The Server Court. Not read. |
| Declare heading | **Choose what to check** |
| Declare body | A check changes nothing in the town, it only tells you what is going on inside a building. Answer its {n} questions and the reading comes back as firm as your answers were: at the bottom a maybe you can still work from, at the top a firm reading on the building you asked about and the one next to it. Every check uses one of your diagnostics. |
| Commit control | **Run it** |

**The declare body is deliberately not the sentence the other briefs use, and it must not be
normalised back into one.** Two reviews of this folder found eight of the nine briefs carrying one
template with the noun swapped: *"Pick a {thing}, then answer {n} questions. How many you get right
sets {outcome}."* That is the *"one encounter in the hand"* failure **D-CRISIS-19** exists to forbid,
and it lands hardest here, because era nine is a crisis somebody will build. The rewrite says only
things that are true of era nine and of nothing else in the folder: **a check acts on what the player
knows and not on the board**, which is section 1's whole ritual and the one axis no other crisis has;
**the bottom rung returns something usable**, which is **D-CRISIS-22**'s protected partial credit and
the reason the hedge is named rather than described as a weak result; and **a check draws on a finite
budget**, which after D-CRISIS-33 is the only action budget in the shipping set. The body states the
two ends of section 4.2's ladder and leaves the middle rung to the cards, so it does not commit
[Q1](#13-open-questions) any further than section 4.2 already does. The folder's README records the
same defect in the six shelved briefs.

### 9.2 The cards

| Line | String |
| --- | --- |
| Diagnostic, name | **Check the Data Hall** |
| Diagnostic, body | Lifts the covers and reads what is under it. |
| Diagnostic, cost | Takes 1 diagnostic |
| Isolate, name | **Isolate the Data Hall** |
| Isolate, body | Cuts it off. If this is the one, it is over. |
| Isolate, cost | Suspends the Data Hall. Livability down 14. |
| Isolate, second stage | **Yes, isolate it. If this is wrong, the source moves and every reading goes old.** |
| Clear, name | **Bring the Data Hall back** |
| Clear, body | It rejoins and its livability comes back. |
| Ladder rung 1 | 1 right: a rough reading, likely one way or the other |
| Ladder rung 2 | 2 right: a firm reading on this building |
| Ladder rung 3 | 3 right: a firm reading here and on the one next to it |
| Unavailable | Already read since the last isolation. |
| Armed | **Chosen** |
| Committed | Running. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading, diagnostic | **Checking the Data Hall** |
| Cost first | Takes 1 diagnostic. You have 3. |
| Coverage | This reads the Data Hall. At three right it reads the Server Court as well. |
| Quality ladder | 1 right gives a rough answer. 2 or 3 give a firm one. |
| What is known | Four read. One compromised, two likely, one clear. Three of those were read before the last isolation. |
| Heading, isolation | **Isolating the Data Hall** |
| The risk, always shown | If this is wrong, the source moves and every reading goes old. |
| The cost | Livability down 14 while it is cut off. |
| The bet | You can see what this costs. You cannot see whether it is the right building, and that is the whole of it. |

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
| Last question | **See what came back** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Three right | 3 right. A firm reading on the Data Hall, and on the Server Court next to it. |
| Two right | 2 right. A firm reading on the Data Hall. |
| One right | 1 right. A rough reading: the Data Hall is likely compromised. |
| None | 0 right. The readings came back too noisy to use. |
| Reading, clear | The Data Hall is clear. |
| Reading, likely | The Data Hall is likely compromised. |
| Reading, compromised | The Data Hall is compromised. |
| Isolation, right | **That was it.** The Data Hall is cut off and the systems are clean. |
| Isolation, wrong | The Data Hall was clean. It is cut off and its livability is down, and the source has moved. Your readings are old now. |
| Budget spent | **The check is over.** The source is still in there, and the buildings you cut off can be brought back. |

**On the wrong-isolation line.** It states three facts and stops. It does not tell the player they
were impatient, and it does not explain the rule again, because the rule was on the confirmation
control they pressed.

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.** **Era nine is the crisis where
that matters least and most at once:** least, because the evidence board is already the primary UI
and it is text; most, because the entire board state is information rather than geometry.

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Building unread | none | **Blank lit panel**, no duct collar, evidence board row |
| Clear | none | **One segment lit**, **flush collar**, evidence board row |
| Likely compromised | none | **Two segments, the second half height**, **raised collar**, evidence board row |
| Compromised | none | **Three segments, full height**, **doubled collar**, evidence board row |
| Reading stale | dimmed panel | **A bar under the segments**, **a cut notch across the collar**, and the words *"read before the last isolation"* |
| Building isolated | none | **Blanking panels** (silhouette), **corner isolation plate**, **panel dark**, evidence board row |
| Cover lifted | none | Geometry: cover leaning, barrier round it |
| Proposed diagnostic or isolation | outline | **Outline rather than solid** |
| Budget | none | **Matrix count**, and a number in the header |
| Card armed / unavailable / committed | border | Corner flag; reason text; diagonal hatch |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Building, unread | `The Server Court. Not read.` |
| Building, clear | `The Server Court. Clear.` |
| Building, likely | `The Data Hall. Likely compromised.` |
| Building, stale | `The Data Hall. Compromised, read before the last isolation.` |
| Building, isolated | `The Data Hall. Cut off. Its livability is suspended.` |
| Diagnostic card | `Check the Data Hall. Lifts the covers and reads what is under it. Takes one diagnostic. You have three. One correct answer gives a rough reading, two or three give a firm one.` |
| Isolation card | `Isolate the Data Hall. Cuts it off. Suspends its livability by 14. If this is wrong, the source moves and every reading goes old.` |
| Confirmation | `Yes, isolate it. If this is wrong, the source moves and every reading goes old.` |
| Budget | `Three diagnostics left.` |
| Evidence summary | `Four read. One compromised, two likely, one clear. Three of those were read before the last isolation.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **Staleness is carried by a bar and a dimming**, which are silent. **Every stale row must say so in
  words**, every time, and the summary must give the count. **A player who forgets that three of
  their four readings are old will isolate the wrong building**, and that is the crisis's whole
  failure mode.
- **The relocation happens all at once and changes every row.** It gets an assertive live region:
  *"The source has moved. Every reading is now old."*
- **The budget** is the boundedness guarantee and it belongs in the header region.
- **The evidence board is sorted by reading**, and the sort order must be announced, or a
  screen-reader user cannot tell why the list is in the order it is.

---

## 11. The consolidated asset list

**21 items.** Only one is a texture and it is drawn procedurally in code.

### Atmosphere (6)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Intrusion lighting preset: nine numbers, key down so the emissive panels have contrast | Treatment |
| A2 | Sky and fog preset: flat cool grey, far plane pulled in | Treatment |
| A3 | **Lifted inspection cover, leaning, with its barrier**, 2 or 3 arrangements | Geometry |
| A4 | Duct and fibre marker collars: flush, raised, doubled, and notched | Geometry x4 |
| A5 | Opened-enclosure dressing, full cycle rank, pump-house door open | Geometry, from existing props |
| A6 | Island clip for the ground layer, so cells past radius 30 are not drawn | Treatment |

### The panels (5)

| # | Item | Kind |
| --- | --- | --- |
| P1 | **Status panel: geometry with an emissive face, one per building** | Geometry + material |
| P2 | **Panel readout content: blank, one segment, two with a half-height second, three** | CanvasTexture, drawn in code |
| P3 | Stale readout: the same segments with a bar under them, and the emissive dropped | CanvasTexture + material |
| P4 | Dark panel: the isolated state | Material |
| P5 | Panel update interpolation, and its posed still | Animation rig |

### The buildings (4)

| # | Item | Kind |
| --- | --- | --- |
| B1 | Shutter plate, era nine: flush blanking panels in the curtain-wall module | Geometry |
| B2 | Corner tag, era nine: a service isolation plate with a single cut bar | Geometry |
| B3 | Proposed-diagnostic and proposed-isolation outlines | Geometry |
| B4 | Restore transition: panels off, status panel lit, on the existing cross-fade | Treatment |

### The UI (6)

| # | Item | Kind |
| --- | --- | --- |
| U1 | **The evidence board**, sorted by reading, full at 920 and filtered at 460 | DOM |
| U2 | Action card with its cost zone and five states | DOM |
| U3 | Action glyphs: check, isolate, bring back | SVG x3 |
| U4 | **The two-stage isolation confirmation control** | DOM |
| U5 | Read-out panel: cost first, coverage, quality ladder, and the known summary with its stale count | DOM |
| U6 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 10 geometry items or sets, 2 drawn textures, 3 materials, 1 animation rig, 3 SVG
sets, 5 DOM designs, 3 treatments. **Build P1 and P2 first.** The status panel is the crisis: with a
lit matrix by every door and four readings on it, the game is playable from the island alone.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

1. **Era nine's own signature move.** *"The sealed reflective skin"*, a building showing *"a
   reflection of the sky and the next building along"*, is **not renderable**: there is no
   environment map, nothing to reflect, and `metalness` is 0 across the island by convention. **This
   is the largest single gap between an era's authored identity and what can be drawn, anywhere in
   the ten**, and it is era nine's problem before it is the crisis's. The crisis inherits a town of
   pale faceted planes and works with it.
2. **The uplighters in era nine's own props kit.** They are light fittings and they cannot light
   anything. As bright faces pointing up they are fine and they will not wash the wall above them.
3. **A screen showing real content.** Only through a procedurally drawn `CanvasTexture`, which is
   what P2 is. Anything that would be an image file is unbuildable, and **the segment readout in
   section 3.3 is deliberately simple enough to draw in code.**
4. **Night, with the town lit by its own panels.** The most attractive image this crisis has and the
   one that would expose the renderer worst: bright rectangles in darkness with no falloff and no
   spill read as broken. Section 2.1 goes to a dim flat late afternoon for exactly this reason.
5. **Anything underground made visible.** Era nine's whole premise is buried machinery, and there is
   no cutaway, no section view and no transparency path that would show a service void's contents.
   **The crisis draws an open cover and a barrier, and what is under it stays a fact in the rail.**
6. **A per-cell ground layer at era nine's authored radius.** 820 cells at radius 65, past the grass
   at 30 and past the lagoon at 58.
7. **A visible intruder.** Buildable, and ruled out in section 3.5 on design grounds rather than
   technical ones: anything drawn either gives the answer or is decoration.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **Does the top rung widen the reading or sharpen it?** Section 4.2 draws it as widening, so one, two and three give hedged, firm, and firm-plus-a-neighbour. D-CRISIS-22 protects the bottom rung and says nothing about the top. | Team lead | It decides whether the read-out panel's coverage line exists and whether a diagnostic can light two panels |
| **Q2** | **How big is the diagnostic budget?** Carried as **O-18**. Era nine's is the only budget of the three that does not already exist in some form, and it is also the crisis's only boundedness guarantee. | Team lead, with whoever tunes it | It is the header's most important number and the thing that decides whether guessing is a strategy |
| **Q3** | **Can a wrongly isolated building be brought back during the crisis?** Section 6.1 draws the card because a permanent suspension mid-crisis compounds hard. Not ruled. | Team lead | A card, a glyph, a set of copy, and a change to what section 8.2 says persists |
| **Q4** | **How is era nine's suspended capacity restored after the crisis?** The crisis spec lists eras four and nine as unspecified: whether a wrongly isolated building is bought back or released on resolution is not ruled. | Team lead | It decides whether the exit lifts every blanking panel or leaves some for a repair action |
| **Q5** | **Does relocation move the source to a building already read?** If it can, a stale *"clear"* is actively misleading, which is either the point or a defect. | Team lead | It changes how hard section 3.4's stale marking has to shout |
| **Q6** | **How many buildings are in the crisis, and is every building readable?** Section 3.2 puts a panel on every building. | Whoever authors era nine's content | It decides whether the evidence board fits at 460 and how many P1 instances the scene carries |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-18 (the wrong-isolation
  cost and the relocation), D-CRISIS-22 (the protected partial credit), D-CRISIS-26 (the budget, the
  solve condition and the unsolved ending), section 7's note that era nine inverts the preview
  discipline, section 9's two different hidden-state machineries, and INV-CRISIS-1, 3, 4, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, shutter plate, copy
  rules and per-era decal reach
- `docs/superpowers/specs/crises/era-02-lost-herd.md`: the other half of the shared cadence, and the
  ground-covered against certainty separation
- `docs/superpowers/specs/eras/era-09-information/style-guide.md`: the sealed reflective skin, the
  engineered paving on structure with its inspection covers, and the props kit including the display
  panel and the pavilion that is really a pump house
- `apps/web/src/city/three/StarterIsland.tsx`: the one `CanvasTexture` in the renderer, and the
  precedent for P2
- `apps/web/src/city/three/MasteryStars.tsx`: emissive at 1.35, the precedent the status panels rest
  on
- `engines/game/src/crisis-damage.ts`: `suspended_civic`
- #298: era nine's buildable radius of 65
- #302: era one's brief
