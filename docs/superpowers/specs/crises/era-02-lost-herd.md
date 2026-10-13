# The Lost Herd: design and asset brief

**Era:** 2, Neolithic
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built, and the crisis has no
engine, no tuning numbers and no authored land.
**Measured at:** `origin/integration` `952a0983`. Figures taken off that tree or off a named open
pull request.
**Audience:** a designer or modeller who will not read the code. The file paths are for whoever
implements what you draw.
**Scope:** era two's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** The mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md` and are quoted, not revisited. Where a
ruled mechanic is hard to render, section 12 says so. Where the ruling is silent and presentation
cannot proceed without an answer, section 13 asks the owner rather than inventing one.

---

## 0. The hard boundary

**Read `./README.md` before designing anything here.** It carries the measured renderer boundary
for all nine briefs. The four items that bite hardest on era two:

1. **There are no image textures.** Not one. `apps/web/public` holds audio and nothing else, and the
   only texture in the renderer is a `CanvasTexture` drawn in code. A hoof-print texture, a dust
   overlay, a painted track in the soil: none of these is a deliverable. **Surface interest comes
   from geometry.**
2. **Nothing tints a building at runtime.** `faceTones()` exists and no renderer calls it. A vacant
   house cannot be drawn by greying it. It is drawn by **adding geometry**, which is what the
   shutter plate in the shared brief is.
3. **There is no fog of war.** Fog is one linear distance setting for the whole scene. Era two hides
   *where the herd is*, and that hiding is done with **ground markers and the absence of them**,
   never with darkness over a region.
4. **There are four global lights and no local light.** The search runs late in the day and no
   lantern can light anything.

## 0b. What is available

Procedural geometry without limit in kind; silhouette as the channel that survives zoom-out; flat
colour per mesh and per-vertex colour; flat shading; emissive as a bright face up to about 1.35;
`useFrame` animation gated on `prefers-reduced-motion`; several hundred small meshes posed per
frame; **the shared ground-decal depth ladder**, which is where most of this crisis lives; and the
nine lighting numbers plus the sky and fog colours, which are one table row and change the whole
island at once.

---

## 1. The crisis, and what the player does

**The premise, in one line.** The settlement's animals have wandered off the worked land, and
nobody knows where they went.

**The ritual: I follow and compare clues.** This is the thing era two asks that no other crisis
asks. Every other crisis puts the answer on the board and asks where to act. Era two puts the
*question* on the board: the player is not choosing where to place a thing, they are choosing
**where to look**, and the board is mostly empty of information until they do.

**The cadence: choose an investigation, then answer to set the quality of the information.** The
declaration comes first and the batch follows it, exactly as era one's does, but what the batch
sizes is not the strength of an effect. It is **how much ground the search party covered**.

**Duration: solve it.** The crisis ends when the herd is found. It also ends when the **search
budget** is spent, and then it ends **unsolved with the damage standing** (D-CRISIS-26). Era two's
budget is not new: its axis in the crisis spec is already *"Information-gathering under a search
budget"*. What D-CRISIS-26 added is that running out is an ending.

**The stake, and its framing is part of the ruling.** Each failed search step or missed threshold
causes a **departure event**: families leave, and some livability or happiness capacity becomes
unavailable. **The settlement does not lose population. It loses the ability to support
population.** Describe it as families leaving behind vacant homes and weakened civic capacity, and
never as population falling. That wording is doing real work: the first reading breaks D-CIT2 and
the second does not.

**Entry.** After `ceil(n / 2)` of era two's own nodes, which for era two's five nodes
(`EXP.1`, `RAD.1`, `RAD.2`, `RAD.3`, `RAD.4`) is **three**. The crisis announces itself and waits;
a player mid-lesson finishes the lesson (D-CRISIS-10).

**Era two is the gentlest of the ten by design**, and the crisis spec says so explicitly. Nothing in
this brief should make it feel like era one with sheep. The register is *worry*, not *emergency*.

### The one distinction this crisis has to protect

Era two and era nine **share a cadence**: both choose an investigation and then answer to set the
quality of the information. They are seven eras apart, which is the safest possible placement for a
shared cadence, and they still have to separate.

**D-CRISIS-22 rules that era nine is the only crisis where being partly right gives something
partly useful.** So era two's weak result must not be a hedged reading. The separation this brief is
drawn on:

| | Era two | Era nine |
| --- | --- | --- |
| What accuracy sizes | **How much ground the party covered** | **How certain the reading is** |
| A weak result | A definite answer about a small area: *"nothing in the near field"* | A hedged answer about the area asked: *"likely compromised"* |
| What the player does with it | Rules ground out, slowly | Acts on a probability, or pays to sharpen it |

**The ruling is silent on this and the brief cannot be drawn without it**, so it is
[Q1](#13-open-questions) rather than a decision taken here. Everything below assumes the era-two
column, because that is the reading under which D-CRISIS-22 stays true.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI in it, a player can tell the herd is out. The
world turns when the crisis begins and comes back when it ends.

**The constraint:** this is a *state* of era two's island, not a re-theme. Era two's floor in the
ten-era ground ladder is the **worked land**: broken plots, furrows, boundaries of picked stone,
penned animals, stored grain, against untouched tussock beyond. **Nothing in this brief may change
that floor.** The crisis is a layer added at entry and removed at exit, and era two's island
underneath must be identical before and after.

Written against the six axes the era guides use. Where an axis does not change, that is said.

### 2.1 The light

One table of nine numbers, authored first and judged in a render before anything else here is
drawn. **The direction: late in the working day, clear, and long.** Not dusk, not night, not
overcast. This is the light of people still out when they should be home.

| Lever | Era two's day preset today | Lost Herd direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Warmer and deeper**, toward late gold. The one lever that says "late" without saying "dark" |
| Key intensity | 1.32 | Slightly down. Not much: this is a clear evening, not weather |
| Key angle | Low and raking | **Lower still.** Long shadows across the furrows are the single strongest cue available, and this island is nothing but ruled ground for them to fall across |
| Hemisphere sky | `#CFE6F6` | Slightly cooler, so the shadowed sides go blue against the gold |
| Hemisphere ground | `#C08F57` warm earth | Keep warm. The bounce off broken soil at this hour genuinely is warm |
| Hemisphere intensity | 0.95 | Down a little. Directionality is the point |
| Ambient | `#F5EFE2` at 0.30 | Down slightly, and cooler |
| Rim | `#BFDCEF` at 0.48 | Keep. Silhouette separation carries the empty pens |
| Background (sky) | `#BFE1F2` clear blue | A deeper blue at the top grading warm at the horizon, using the sky's existing two-colour ramp |
| Fog colour | `#D6ECF7` | Warm haze rather than cool |
| Fog near and far | `radius x 3` to `radius x 20` | **Pull the far plane in somewhat.** Distance is the antagonist here: the herd is out past where you can see |

**The rejected option, recorded so it is not re-proposed.** Letting the light get later as the
search budget is spent is evocative and it is wrong twice: it would make the remaining budget a
state carried by colour alone, which INV-CRISIS-16 forbids, and a world that darkens as you act
reads as a timer to the person it happens to, which is the exact impression D-CRISIS-3 rules
against. **The light changes once, at entry, and then holds.**

### 2.2 Ground

**Era two's ground is four surfaces already** (worked plot, untouched tussock, boundary, hollow
way), and the crisis adds a fifth: **searched ground**.

- **Searched ground is the whole point of the ground layer**, because the player's real problem is
  remembering where they have already looked. It is a **very low decal course** on the shared depth
  ladder, reading as ground that has been walked over and over: the tussock knocked flat, the soil
  scuffed. One tone step off the surface under it, never a new colour family.
- **Trampled ground** is the clue-bearing state, and it is a **relief** rather than a tone: broken
  furrow ridges, a stretch of boundary knocked down, ground poached into hollows. This is the thing
  the player is hunting for, so it must read at zoom-out from silhouette relief, not from tint.
- **Untouched tussock stays untouched.** The half of the island nobody has broken is where the herd
  went, and it must keep reading as unworked or the search has no destination.

**The reach question, and era two is the one era with a good answer.** Under
#298 era two's buildable radius is
**30**, which is exactly `ISLAND_GRASS_RADIUS`. Its 172 cells cover 2,752 square units of a 2,827
unit grass disc, which is **97.3%**. So unlike era one, era two needs **no cap disc**: the square
cell grid inscribes the round disc and what is left is a thin scalloped fringe. **Author a fringe
piece for the last 2.7% and the ground layer is complete.** #298 is open and not merged, so this
figure is conditional on it.

### 2.3 Vegetation

**The crop is the tell, and it is free.** Era two's vegetation is the two-family split that carries
the era's whole identity: cultivated rows against wild scrub. The crisis does not change what grows.
It changes **what has happened to it**:

1. **A broken crop line** where something went through: two or three plots with their rows flattened
   in a path, using the trampled-ground relief above. This is the cheapest high-value item in the
   whole brief.
2. **Grazed patches** at the field margins, where the ground is cropped short against the standing
   crop beside it. A height difference on existing geometry, no new plant archetype.
3. **Nothing wilts, nothing browns, and nothing flowers.** The crisis is a day long in fiction. A
   dying crop is a different crisis.

### 2.4 Water and shoreline

**Unchanged, and deliberately.** Era two's guide is explicit that the era spends its whole change
budget inland and leaves the water's edge almost untouched, which is what leaves the Bronze Age its
quay. **The Lost Herd must not be the thing that breaks that.** The reed margin is a search region
in section 3 and it is searched by markers laid on the ground, not by changing the water.

The one permitted addition: **the reeds at one margin are pushed flat in a band**, as a clue. It is
trampled-ground relief applied to reeds, not a change to the shoreline.

### 2.5 Signs of habitation at the margins

**This is where era two's crisis is loudest, and all of it is prop dressing that already exists in
the era's kit.** The settlement has dropped what it was doing:

- **The pens stand open and empty.** Era two's props kit has hurdle sections, a stake-and-hurdle
  corner, a gate of lashed poles, a race between two hurdle runs, and spare panels leaning where the
  last pen stood. **Pull one hurdle run aside and hang the gate open** and the era's own signature
  prop tells the whole story with no new asset.
- **The threshing floor is swept and idle**, the winnowing basket set down, the quern abandoned
  mid-use with husk still round it.
- **Storage pits are lidded and untouched.** The grain is fine. That is the point: this crisis is
  not a famine.
- **A dog waiting at the gate.** One small mesh, and the single most economical piece of
  storytelling available. Optional, and recommended.

**What must not appear:** anything that reads as a raid or a wolf. Nothing is chasing the herd. The
animals wandered, which is why the crisis is a search and not a defence.

### 2.6 Does anything move

**Yes, and it should be small.** A settlement holding still.

- **Dust hanging low over the trampled line.** A field of small meshes drifting slowly on the
  island's wind vector, thinner and lower than era one's snow. It is the one motion that says
  "something went through here recently".
- **The search party itself does not walk.** No pathing agent, no walk cycle. A search that resolves
  on a batch is not a journey the player watches, and animating one would imply a duration the
  mechanic does not have.
- **Every animation is gated on `prefers-reduced-motion`** and holds a posed still frame.
- **Nothing that moves may advance the encounter.** A search step happens because a button was
  pressed.

### 2.7 The transition, in and out

**In:** the nine lighting numbers, the sky and fog, the ground decal course appearing empty (nothing
searched yet), the pens opening, the trampled line appearing.

**What never changes:** the buildings, their placement, their mastery stars, the roads, the island's
geometry, the shoreline, and era two's authored ground palette.

**How it turns:** a short cross-fade on the lighting and fog, the same shape as the existing
building-stage cross-fade. **Spend more on the entry than the exit**, because the entry is where the
crisis announces itself.

**On the way out, and this is era two's own moment:** the herd comes back. Recommended treatment is
that the pens fill and close, in one cut, at the resolution panel. **If the crisis ends unsolved the
pens stay open**, and that absence is the strongest available statement of an unsolved ending.

### 2.8 The read, in one sentence

*The same worked island late in the day, with the pens standing open, a broken line through the
crop, and nobody in the fields.*

---

## 3. The hazard

**Era two is the only one of the nine whose hazard is not a thing.** There is no fire, no raider, no
fault. The antagonist is **absence**, and the board's job is to make absence legible.

### 3.1 The three questions the board must answer

1. **Where have I looked?** This is the real burden of the crisis and the thing a player will get
   wrong without help.
2. **What did I find there?** A searched region either yielded a clue or ruled itself out, and both
   are results.
3. **Where can I still look?** The search budget is finite, so the unsearched set is what the player
   is choosing from.

### 3.2 The search regions

**The board is not the cell grid.** Era two's crisis is fought over **named regions**, because
"follow and compare clues" is a claim about places, not about tiles. Regions are authored from era
two's own island: the high scrub, the reed margin, the far shore, the stone clearance, the hollow
way, the terrace above the plots. **Six to eight is the right number**, each large enough to read as
a place at full zoom-out.

Each region is drawn as a **boundary**, not a fill: a low run of the era's own picked-stone
clearance heap around its edge, on the ground-decal ladder. A fill would cover the ground the player
is reading for clues, and the era's boundary vocabulary is already exactly this object.

### 3.3 The three region states, and none of them is a colour

| State | Geometry | Second channel | Reads as |
| --- | --- | --- | --- |
| **Unsearched** | The boundary run alone, low and quiet | No marker inside it | A place, not yet a result |
| **Searched, nothing found** | Boundary plus the **searched-ground** decal course filling it | A **laid-flat marker stone** at the region's centre: the era's own clearance stone, on its side | Ruled out, and visibly done |
| **Searched, clue found** | Boundary plus searched ground plus **trampled relief** | A **standing marker stone** with a **token socket** in its top, holding the clue token | Somewhere worth comparing |

**The standing stone against the laid stone is the whole state read**, and it works at any zoom
because it is a silhouette difference. Colour is doing nothing here, which is deliberate.

### 3.4 The clue tokens

Era two's tally descendant is **a clay tablet with rows of impressed marks and a bowl of small clay
tokens**, and it is the era's authored prop. **The crisis uses it unchanged.** A clue is a token.

Four clue kinds, distinguished by the **impressed mark** on the token face and by nothing else:

| Clue | Mark | What it means in fiction |
| --- | --- | --- |
| **Track** | Two parallel strokes | Something went through, in a direction |
| **Graze** | A cropped arc | They stopped here |
| **Wool** | A hooked stroke | They passed a fence |
| **Water** | A wavy stroke | They drank here |

**The marks must be legible at the size a token renders in the rail**, which is a UI size and not a
world size. In the world the token is a lump of clay in a socket; in the rail it is an SVG at
32 units square. Two objects, one meaning, and the SVG is where the mark actually has to read.

---

## 4. The player's own mark

**The player's mark in era two is the tablet, not anything on the ground.** Era one's player builds
fires; era two's player accumulates a record. That difference is the ritual, and the brief should
lean on it rather than fight it.

### 4.1 The tablet

A slab of damp clay in the rail, ruled into rows, with a **bowl of loose tokens** beside it. Every
clue the player finds arrives in the bowl. **Laying two tokens together in a row on the tablet is
the compare gesture**, and it is the one interaction era two has that nothing else in the ten has.

**What comparison produces is a bearing**, drawn on the board as a **line of small marker pegs**
running from the first clue's region toward the second's and continuing past it. Pegs, not a drawn
line: era two has no drawn lines on its ground and the peg is a real object of the period.

**Whether comparing costs a search step is a mechanics question and is not settled here.** See
[Q2](#13-open-questions). The presentation works either way: if it is free the tablet is a workspace,
and if it costs a step the tablet is a decision surface. **Draw it as a decision surface**, because
that degrades gracefully in the free case and the reverse does not.

### 4.2 The three quality grades

Accuracy sets **how much ground the party covered**, per section 1. The board shows the difference as
**how much of the region got the searched-ground course**:

| Grade | On the board | In the rail |
| --- | --- | --- |
| **Full sweep** | The whole region fills with searched ground | *"They covered the whole of it."* |
| **Partial sweep** | A lobe of the region fills, the rest stays unsearched and can be searched again | *"They got through about half of it."* |
| **A look** | One small patch fills | *"They only got to the near edge."* |

**The unsearched remainder is the mechanic made visible**, and it is why this reads as *less ground*
rather than *worse information*. A partial sweep leaves something to come back to. A hedged reading
would not.

**At the bottom rung the party still goes out.** INV-CRISIS-4: accuracy sizes the action and never
decides whether it happens. Era one's proof is a fire that is lit and wards nothing; era two's is a
party that walks out and reaches the near edge.

---

## 5. The crisis surface

### 5.1 At 920

Two columns. **The island fills the left**, live, at the same camera the city uses. **The rail sits
on the right at `min(430px, 42vw)`**, which is the width era one's rail already holds and it is the
right one: the search regions run out to the rim, and a centred panel would cover the ground being
chosen between.

Rail order, top to bottom:

1. **Header**: the crisis name, and the search budget as **tokens remaining**, drawn as pips.
2. **The tablet**, with the token bowl. It is the tallest element and it is deliberately above the
   action cards, because the ritual is *compare, then decide*.
3. **The region cards**, one per unsearched region, in the order they sit on the board.
4. **The read-out panel**, appearing when a region is armed.
5. **The commit control**.

### 5.2 At 460

One column, stacked, **board first**. The board holds a 4:3 crop of the island framed on the
settlement, and the region boundaries are the thing that has to survive the crop.

The stack order changes in one place: **the tablet collapses to a summary strip** ("4 clues found,
2 compared") that expands on tap. At 460 a tablet with eight tokens on it would push the region
cards below two folds, and the region cards are what the player came to press.

**Nothing in the rail may exceed 460 minus 32 units of gutter, which is 428 units of content.** The
region card is designed to that width and stretches to the rail's 430 at the wide size.

### 5.3 The hierarchy, in one line

**The board is the subject, the tablet is the working surface, the cards are the verbs.** If a
player looks at this screen and reads the cards first, the layout has failed.

---

## 6. The option cards

**Era one's cards failed because four different kinds of decision wore one white box.** Era two has
one kind of decision repeated over several places, which is a different problem: **the cards are
genuinely alike, so what has to differ is the region, not the card.**

### 6.1 What a region card must say

Four things, at a glance, without arming it:

1. **Which place**, by name and by its position on the board.
2. **What is already known about it.** Searched or not, and what was found.
3. **What the batch will reach**, as the three-rung ladder, on the card rather than under it.
4. **Whether it is available**, and if not, why.

### 6.2 The card, drawn

A card 428 units wide and about 96 tall. Left edge: a **plan glyph of the region's own outline**,
40 units square, in the same shape the boundary makes on the board. That glyph is the whole
identity system: no two regions have the same outline, so no two cards look alike, and a player can
match card to ground without reading a word.

Right of the glyph: the region name at 16 units, then the known-state line at 13, then the
three-rung ladder as three small pips with 1, 2 and 3 in them, keyed to the same badge the board
uses for a preview.

**The card carries no colour of its own.** Its background is the rail's surface. What changes
between cards is the glyph and the words.

### 6.3 The five states

| State | When | Treatment |
| --- | --- | --- |
| **Idle** | Available, not chosen | 1-unit border in the rail's line colour. Calm, and not competing with the board |
| **Hover** | Pointer over it | The border thickens to 2 units and the card lifts 1 unit. **No colour change**, and the matching region on the board raises its boundary by one rung so the player can see which place they are about to choose |
| **Armed** | Chosen, aiming | 3-unit border, a **filled corner flag** in the top left carrying a check glyph, and the word **Chosen** appearing in the card's top right. `aria-pressed="true"` |
| **Unavailable** | Already fully searched, or no budget left | **The reason replaces the ladder**, in the card's own body. Not a tooltip, and not a dimming with no explanation. `disabled`, with `aria-describedby` pointing at the reason line |
| **Committed** | Declared, locked | The card keeps its place, gains a **6-unit diagonal hatch** across its background, and the ladder is replaced by the declared line. It looks locked rather than merely selected, because the declaration is irreversible by design (INV-CRISIS-5) |

**The hatch is the spent treatment across all nine briefs**, and it is a texture rather than a
colour so it survives the colourblind palette variant.

### 6.4 Cost

**Era two's cards have no material cost**, and that is worth stating so nobody invents one. What a
search consumes is a **search step**, and steps are shown as pips in the header, not as a price on
the card. **A step is not a currency and must not be written as one** (see section 9).

---

## 7. The read-out panel

**INV-CRISIS-10: everything provisional is previewed before it is committed.** The player never
learns what an action reached by having already taken it.

### 7.1 What it is for

The player has armed a region and has not committed. The panel answers one question: **is this place
worth a step, given that I do not know how well I will answer?**

### 7.2 The direction

- **Lead with the smallest outcome.** The player cannot choose their grade. What they can choose is
  a region whose *worst* result they can live with. Reading strongest-first shows the best case
  first, which is backwards for a decision like this.
- **Show it as ground, not as numbers.** The panel's main element is a **plan of the region with the
  three sweep extents nested inside it**, drawn as the same three outlines the board uses. This is a
  second view of the board's own figure and it should look like it.
- **Name what is nearby.** If a region borders one already searched, say so. Adjacency is the thing
  a player reasons with and it is invisible in a list.
- **No dashed borders.** A dashed rule reads as a placeholder or a drop target. This is a real
  computed read-out.

### 7.3 The provisional register

**Provisional states are outlines, never fills**, exactly as era one's are, and the sweep extents
are drawn on the board as raised outlines with a numeric badge giving the number of correct answers
that reaches them. A committed search *fills*; a proposed one *frames*. Confusing the two would
invert the decision.

---

## 8. Damage and consequence

**Era two's damage is the only one of the nine that draws no ruin.** Nothing is destroyed here. The
consequence is **capacity that has become unavailable**, and it is drawn with the shutter plate from
the shared brief.

### 8.1 The departure event, on the board

A departure event picks a dwelling or a civic building and suspends part of what it supports.

| Stage | What is drawn | Channels |
| --- | --- | --- |
| **Standing** | The building as authored | (none) |
| **Vacant** | **Shutter plates** over the openings the camera can see, in era two's own boarding material: split poles lashed across the opening, which the era's hurdle vocabulary already supplies | Silhouette change, plus the **corner tag** |
| **Restored** | The plates removed, the building exactly as it was | The absence, plus the tag gone |

**The corner tag** is a small angled plate at the building's front lower corner carrying one glyph.
Era two's is a **hurdle panel leaning against the wall**, which is the era's own "this pen is out of
use" object and needs no new material.

### 8.2 How it accumulates

**Departure events land one building at a time and they are visible one at a time.** A settlement
with four shuttered buildings should read as four separate decisions that went wrong, not as a
general dimming. This is why the treatment is per-building geometry and not an island-wide state.

### 8.3 Repair

Capacity lost in era two **persists after the crisis** and comes back through a purchasable repair
action, which is the difference between era two's capacity stake and era six's. Nothing here is
permanent and nothing here is free.

**The repair, drawn:** the plates come off in the same cross-fade a building stage change uses. The
building never changed, so there is nothing to rebuild, which is what makes era two the gentlest of
the ten.

### 8.4 The floor

Nothing in this crisis removes a building, relocks a node or touches mastery.
`engines/game/src/crisis-damage.ts` has no field that could record any of those. Era two's whole
consequence lands in `suspended_civic`, which already exists as a durable record and is already
persisted, and which **nothing currently reads into a capacity**. That missing half is the same one
eras four, six and nine need.

---

## 9. The copy

**Register: results, not purchase.** What the player's answers **found**, never what their score
bought. Era two is one of the crises most exposed to the purchase frame, because accuracy converts
directly into how much ground a party covered, and "three correct answers buys the full sweep" is
the sentence that will suggest itself. It is wrong. **A search step may be described as spent; a
correct answer may not.**

**Nothing mechanical will catch a regression in any of this.** The em-dash gate reads `*.json`
under `content/lessons/` and has never been able to see a crisis surface, and the prose scanner that
could read TSX is in no CI step at all. **This copy is enforced by a reviewer and by nobody else.**

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Lost Herd** |
| Entry announcement, heading | **The herd is out** |
| Entry announcement, body | The animals are off the worked land and nobody saw which way they went. You can go when you are ready. |
| Entry announcement, control | **Go and look** |
| Header, budget | **{n} searches left** |
| Board label | The island. Choose a place to search. |
| Tablet heading | **What you have found** |
| Tablet, empty | No clues yet. Search somewhere and see what comes back. |
| Declare heading | **Choose where to look** |
| Declare body | Pick a place, then answer {n} questions. How many you get right sets how much ground the party covers. |
| Commit control | **Send the party** |

### 9.2 The region cards

| Line | String |
| --- | --- |
| Name | **The reed margin** (and so on, one per authored region) |
| Known, unsearched | Nobody has been out there yet. |
| Known, partly searched | The near half is done. Nothing there. |
| Known, clue found | Tracks, heading inland. |
| Ladder rung 1 | 1 right: the near edge |
| Ladder rung 2 | 2 right: about half of it |
| Ladder rung 3 | 3 right: all of it |
| Unavailable, searched out | Fully searched. Nothing else to find here. |
| Unavailable, no budget | No searches left. |
| Armed | **Chosen** |
| Committed | Party sent here. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **A search of the reed margin** |
| Worst case first | With 1 right, they reach the near edge only. |
| Middle | With 2 right, about half of it. |
| Best | With 3 right, the whole margin. |
| Adjacency note | This borders the stone clearance, which you have already searched. |
| The bet | You can see how far they might get. You cannot see the score yet, and that is the choice. |

### 9.4 The question panel, and the solution

**Every answered question shows the solution, on a correct answer and on a wrong one.** This is
non-negotiable and era one shipped without it.

| Element | String |
| --- | --- |
| Heading | **Question {i} of {n}** |
| Verdict, correct | **Right** |
| Verdict, wrong | **Not this time** |
| Solution heading | **How this one works** |
| Solution body | (the item's own authored worked solution, unchanged) |
| Move on | **Next question** |
| Last question | **See what they found** |

**Where it sits:** directly below the answer field, in the same panel, in the same place in both
cases. The field goes read-only, the verdict mark sits above the solution, and **there is no retry
control**. The tally is already recorded and nothing in this panel can change it.

### 9.5 Results

| Case | String |
| --- | --- |
| Full sweep | 3 right. The party covered the whole of the reed margin. |
| Partial | 2 right. They got through about half of it. |
| A look | 1 right. They only reached the near edge. |
| Nothing correct | 0 right. The party went out and came back with nothing. |
| Clue found | They found tracks at the water. Take a token. |
| Nothing found | Nothing out there. That rules it out. |
| Departure event | A family has left the settlement. Their house stands empty, and the {building} is short-handed until it is put right. |
| Herd found | **The herd is home.** They were in the high scrub. |
| Budget spent | **The search is over.** The herd did not come back this time, and the settlement is smaller for it. |

**On the departure line, note what it does not say.** It does not say the population fell, it does
not tell the player they failed, and it does not narrate the stakes back at them. It says what
happened and what state the settlement is in.

### 9.6 Repair

| Line | String |
| --- | --- |
| Repair control | **Reopen the {building}** |
| Repair cost | {n} grain |
| Repair done | The {building} is back in use. |

**Grain is a material and is genuinely spent**, so it is written as a cost. That is the one place in
this crisis where cost language is correct.

---

## 10. Accessibility

**The canvas is `aria-hidden` and the DOM is the accessible surface**, which is the pattern era one
already established. Every state below has a non-colour carrier and a spoken name.

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Region unsearched | none | Boundary run only, no centre marker |
| Region searched, empty | one tone step | Searched-ground relief, **laid marker stone**, text line on the card |
| Region searched, clue | one tone step | Searched-ground relief, **standing marker stone with a token in it**, trampled relief, text line |
| Sweep extent 1 / 2 / 3 | three outline tones | **Numeric badge 1, 2, 3**, plus three distinct outline strokes (solid, dashed, dotted) |
| Card armed | border | **Corner flag glyph**, the word **Chosen**, `aria-pressed` |
| Card committed | none | **Diagonal hatch**, declared line replaces the ladder |
| Card unavailable | none | **Reason text in the card body**, `disabled` |
| Building vacant | none | **Shutter plates** (silhouette), **corner tag**, status line in the building's own panel |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Region card | `Search the reed margin. Not yet searched. One correct answer reaches the near edge, two reaches about half, three reaches all of it.` |
| Region card, armed | the same, plus `Chosen.` |
| Region card, unavailable | the same, plus `Unavailable. Fully searched.` |
| Region on the board | `The reed margin. Searched, tracks found at the water.` |
| Clue token, in the bowl | `Clue: tracks, found at the reed margin.` |
| Token socket on the tablet | `Row 1, first slot. Empty. Place a clue here to compare it.` |
| Compare result | `Tracks at the reed margin and grazing at the stone clearance point inland, past the terrace.` |
| Budget pips | `Three searches left of five.` |
| Shuttered building | `The Granary. Standing, and short-handed since a family left. Reopening it costs 40 grain.` |
| Solution block | `How this one works.` followed by the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **The bearing produced by comparing two clues is a line of pegs on the ground**, which is silent.
  It must also be a sentence, and the sentence is the one in the table above.
- **Region adjacency** is obvious on the board and invisible in a list. Every region's accessible
  name ends with the regions it borders.
- **The search budget** is pips. It is also a number in the header's accessible name.

---

## 11. The consolidated asset list

**26 items.** "Treatment" means a specification plus tuned numbers rather than a mesh. **Kind is one
of the six the shared brief permits**, and no entry here is a bitmap.

### Atmosphere (7)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Lost Herd lighting preset: the nine numbers plus the key's angle | Treatment |
| A2 | Sky and fog preset: background ramp, fog colour, fog near and far | Treatment |
| A3 | Searched-ground decal course, per cell, for the 172 cells inside radius 30 | Geometry, tiling set |
| A4 | Grass fringe piece for the 2.7% the cell grid does not reach | Geometry |
| A5 | Trampled-ground relief: broken furrow ridges, poached hollows, a knocked-down boundary run | Geometry, 3 to 4 variants |
| A6 | Grazed-margin treatment: cropped crop height against standing crop | Treatment |
| A7 | Low dust field over the trampled line, with a posed reduced-motion still | Geometry + animation rig |

### The board (8)

| # | Item | Kind |
| --- | --- | --- |
| B1 | Region boundary run, built from era two's picked-stone clearance heap, on the decal ladder | Geometry |
| B2 | Laid marker stone: searched, nothing found | Geometry |
| B3 | Standing marker stone with a token socket: searched, clue found | Geometry |
| B4 | Clue token, world version: a lump of impressed clay that seats in B3 | Geometry, 4 marks |
| B5 | Marker peg, for the bearing line produced by comparing two clues | Geometry |
| B6 | Sweep-extent outline set, three strokes, reusing the winter preview's outline builder | Geometry |
| B7 | Sweep-extent numeric badge, 1 / 2 / 3 | Geometry or DOM overlay |
| B8 | Open-pen dressing: hurdle run pulled aside, gate of lashed poles hanging open, spare panels | Geometry, from the era's existing props |

### Damage (3)

| # | Item | Kind |
| --- | --- | --- |
| D1 | Shutter plate, era two: split poles lashed across an opening. One per opening type | Geometry |
| D2 | Corner tag, era two: a hurdle panel leaning against the wall | Geometry |
| D3 | Restore transition: plates off, on the existing stage cross-fade | Treatment |

### The UI (8)

| # | Item | Kind |
| --- | --- | --- |
| U1 | Region card design, at 428 and at 430 | DOM |
| U2 | Region card state set: idle, hover, armed, unavailable-with-reason, committed | DOM |
| U3 | Region plan glyphs, one per authored region, matching its boundary outline | SVG |
| U4 | Clue token, UI version, 32 square, four impressed marks | SVG |
| U5 | The tablet and token bowl, including the collapsed 460 summary strip | DOM |
| U6 | Read-out panel: smallest outcome first, nested sweep plan, adjacency note | DOM |
| U7 | Budget pips | SVG |
| U8 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 15 geometry items or sets, 1 animation rig, 3 SVG sets, 6 DOM designs, and 3
treatments. **Two carry most of the read and should be built first: A1, which changes the whole
island for the cost of a table row, and B3 with B4, because the standing stone holding a token is
the single image this crisis is about.**

---

## 12. Desirable, and genuinely unbuildable under the current renderer

Each of these would improve the crisis and **none can be built without a renderer change**. Listed
so the lead can decide, rather than being quietly dropped or quietly attempted.

1. **Fog of war over the unsearched half of the island.** The obvious way to draw "you do not know
   what is out there" is darkness or haze over the regions nobody has searched. **Fog is a single
   linear distance setting for the whole scene**, and there is no height fog, no volumetric
   scattering and no per-region occlusion. The crisis therefore hides information by **not drawing
   markers** rather than by hiding ground, which is why section 3.3 puts so much weight on the
   marker stones.
2. **Lantern light on a search party at dusk.** Four global lights, no `pointLight`, and no spill
   from emissive. A lantern can be a bright face and it will light nothing. **This is the reason the
   atmosphere is specified as late afternoon rather than dusk:** a scene that needs local light to
   read is a scene this renderer cannot draw.
3. **A hoof-print texture in the soil.** There are no image textures anywhere in the city. Tracks are
   **relief geometry** in this brief for that reason, which costs more and reads better at
   zoom-out.
4. **Dust catching the low sun.** Needs scattering. The dust field here is small meshes at a flat
   tone and will read as dust rather than as light in dust.
5. **A per-cell decal at era two's authored radius, drawn before the island grows.** #298's radius
   of 30 matches `ISLAND_GRASS_RADIUS` exactly, so era two is the one era with no clipping problem
   in either direction. **This is a note that the good case is measured rather than assumed**, and
   it stops holding the moment either number moves.
6. **Animals rendered as agents.** A herd that walks is mobile agents with pathing, which no crisis
   has and which two other crises (three and ten) also want. Era two does not need it: the herd is
   **absent** for the whole encounter and arrives at the end, so it can be a single cut.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **Does a weak batch in era two return less GROUND covered, or less certain information?** Section 1 works the distinction through. The crisis spec's cadence table groups era two with era nine, and D-CRISIS-22 rules that era nine is the only crisis where partial correctness is partly useful. Those two cannot both be read loosely. | Team lead | It decides whether the board shows an unsearched remainder inside a searched region, which is the main state in section 3.3 |
| **Q2** | **Does comparing two clues consume a search step?** The ritual is *follow and compare*, so comparison is a player verb, and its cost is not ruled. | Team lead | It decides whether the tablet is a workspace or a decision surface. Section 4.1 draws it as a decision surface because that degrades gracefully in the other case |
| **Q3** | **How many search regions, and are they authored per island or derived from it?** Six to eight is a layout recommendation here, not a ruling. | Whoever authors era two's land | Every region needs a plan glyph (U3), so the count is an asset-list input |
| **Q4** | **Does the headroom cap apply to era two's departure events?** Carried in the crisis spec as **O-4** and **O-9**. If a departure may consume capacity somebody is using, housed citizens become `waiting` and the no-eviction argument in `citizens.ts` loses its premise. | Era progression owner, with the citizens owner | It decides whether a departure can ever be refused, and a refused departure needs its own copy line, which section 9 does not have |
| **Q5** | **What does an unsolved ending leave on the island?** D-CRISIS-26 says the crisis can end with the damage standing. Section 2.7 recommends the pens stay open. Whether that is permanent or lifts at the era advance is not ruled. | Team lead | It decides whether the open-pen dressing (B8) is a crisis-only asset or a persistent one |
| **Q6** | **Is era two's crisis reached from the same entry chip era one uses?** Era one's chip is `WinterEntryChip.tsx` and is era-specific in its copy. | Unassigned | Nine crises need an entry affordance and this brief assumes one shared component |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-5 (the capacity stake and
  its framing), D-CRISIS-9 and D-CRISIS-24 (the `ceil(n / 2)` trigger), D-CRISIS-10 (announce and
  wait), D-CRISIS-14 (era two's 40/60 question window), D-CRISIS-22 (era nine's protected partial
  credit), D-CRISIS-26 (the finite budget and the unsolved ending), and INV-CRISIS-1, 3, 4, 5, 10
  and 16
- `docs/superpowers/specs/crises/README.md`: the shared renderer boundary, the carrier set, the
  shutter plate, the copy rules and the per-era decal reach
- `docs/superpowers/specs/eras/era-02-neolithic/style-guide.md`: the worked land, the four ground
  surfaces, the props kit, and the palette
- `apps/web/src/city/three/WinterGround.tsx`: the decal ladder, the outline builder and the badge
  this brief reuses
- `apps/web/src/city/three/ScarredGround.tsx`, `ruinStage.ts`: the damage vocabulary era two
  deliberately does not use
- `engines/game/src/crisis-damage.ts`: `suspended_civic`, which is era two's whole consequence
- `packages/economy/src/capacity.ts`: `deriveCapacities`, which has no penalty term and is the
  missing half
- `engines/game/src/citizens.ts`: the no-eviction argument, and the compiled guard that makes
  "leaving" a state on a building rather than on a person
- #298: era two's buildable radius of 30
- #302: era one's brief, whose structure
  this follows
