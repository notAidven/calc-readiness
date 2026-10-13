# The Intrusion: art and asset brief, era nine

**Date:** 2026-08-01
**Status:** brief, for a design pass. Nothing here is built and no code is changed.
**Measured at:** `integration` `e53bf9cd`, with
#369 (open, `mergedAt: null`) merged into
the branch this was written on, because this brief's plates extend that PR's generator.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era nine's mid-era crisis, as it renders on the 3D island.
**Plates:** `crisis-reference-packs/intrusion/`, six of them.

---

## 0. What this is, and what it is not

**There is already a merged presentation brief for this crisis and this does not replace it.**
`crises/era-09-intrusion.md` landed with
#307 at `2026-08-01T01:53:21Z` (read from
the API, not inferred from a push) and it rules the surface, the layout at both widths, the copy, the
accessibility table and the asset list. **Read it first.** This document is the art half and it adds
the mechanic inventory (section 1), the cross-crisis propagation reading (section 4) and the plates
(section 7).

> ### Where the brief I was given was inexact, corrected
>
> The task said the three unbuilt crises were *"designs on paper with no art direction at all"*.
> **True when written, false at this tip:** #307 merged a presentation brief for era nine carrying a
> lighting table, the ground treatment, the status panel and its four readings, the stale-reading
> treatment, a motion rule, a transition and an asset list. This pass adds to it.
>
> **One correction that makes era nine's job materially easier and that no era nine document could
> know.** `crises/README.md` lists *"emissive anywhere in the winter layer"* as blocked by a guard,
> and era nine is the crisis that leans on emissive hardest. **That guard was loosened, and it was
> loosened the way that document's own argument asked for**: `winterGround.test.ts:1445` now asserts
> emissive is zero on everything except a **named** flame face, and it asserts the exemption in
> **both** directions, so an exempt material that stops being emissive fails as well. **So era nine's
> lit panel is precedent rather than a request**, and the pattern for permitting it is already in the
> tree. Three further corrections to the shared boundary are at
> `crisis-reference-packs/README.md` section 1a.

---

## 0a. The renderer boundary, which is stated once and not here

**Read `crises/README.md`, sections *"The hard boundary, shared by all nine"* and *"What is available,
which is the more useful half"*.** Measured, shared by all four crises, not restated here.

**Era nine collides with one item harder than any other era in the run**, and it is worth naming
because the collision is not the crisis's fault:

1. **There is no environment map, so nothing can be glassy.** **Era nine's entire signature move is
   the sealed reflective skin**, and its own guide specifies buildings showing *"a reflection of the
   sky and the next building along"*. **That is not renderable.** `metalness` is 0 across the island by
   convention and there is nothing to reflect. **Era nine's glass is pale, faceted and flat-shaded**,
   which is how its buildings will be authored regardless of this crisis. The crisis inherits the
   limitation rather than causing it.
2. **Nothing tints a building at runtime.** A compromised building cannot be drawn by shifting its
   colour. Section 6.
3. **No image textures.** No screen content as a bitmap, no printed graphics, no wayfinding artwork.
4. **Emissive is a bright face and lights nothing.** Era nine's uplighters, its lit panels and its lit
   signage all work as bright faces, and **none of them illuminates the ground, the wall behind them,
   or anything else.**

**And the good news, which era nine gets more from than any other era.** A bright emissive face at up
to about 1.35 is shipped precedent (`MasteryStars` runs it), **era nine's tally descendant is a small
illuminated matrix panel**, and the only texture path in the renderer is a procedurally drawn
`CanvasTexture`, which is exactly how a panel gets a legible readout. **The crisis's whole readout
system is made of the thing this renderer draws well.**

**One lesson from era one's flame that this crisis must not have to learn twice.** `winterFire.ts`
records that running every band's emissive at 1.35 clipped every facet to the same value and threw the
form away: the lead's words were *"i thought we established it wouldnt do this disgusting looking flat
orange square"*. **A single high emissive value is not brightness, it is the loss of shading.** Era
nine's panels are small and flat so they are less exposed to this, but **the panel's bezel and its face
must not both be lifted**, or the panel becomes one bright rectangle with no object in it.

---

## 1. The mechanic inventory, era nine

**Every row is a visual treatment or an explicit statement that this crisis has no analogue.** The 24
rows and their derivation are at `crisis-reference-packs/README.md` section 3.

| # | Mechanic | What the player sees | Told apart from its neighbours by |
| --- | --- | --- | --- |
| M1 | **The crisis call** | The city HUD chip and the era-nine advisor's briefing slides | It is the only crisis surface that appears before the crisis |
| M2 | **The city frozen while a call is unanswered** | Nothing new is drawn. The freeze is a state of the CITY and is announced in the call | **No analogue on the island, deliberately.** A visual mark for it would be a punishment cue |
| M3 | **Entry and exit** | In: the lighting numbers, the flat grey sky, **the covers coming up across the town**, barriers going round them, the status panels going to blank diagnostic readouts, the pump-house door opening. Out: **the covers go back down and the pattern closes.** Section 9 | **Era nine's exit is the best of the four**: the whole crisis was a broken pattern and the ending is the pattern restored |
| M4 | **Atmosphere** | Late, flat and colourless, with the town's own panels the only live things in the frame. **Not night.** Section 3 | The only preset of the four keeping **long soft shadows**. Era four wants short hard ones, era six wants none, era one wants shallow ones |
| M5 | **Ground under the crisis** | **The ground is where this crisis lives.** Covers lifted and leaning, service voids open, barriers round each opening, and raised collars on the duct markers along the routes evidence was found on. Section 3.2 | The only crisis of the four whose ground layer is a **record of where the player has looked** |
| M6 | **Water and shoreline** | **No change**, because the intrusion is not physical. **One exception, and it is the era's best joke on itself**: the pavilion that is really a pump house has its door open, on the side you can now see | The era that hides its machinery has had to open it up |
| M7 | **Vegetation** | **No change at all, and that is deliberate.** Era nine's crisis is a systems failure inside a town still maintained perfectly, and **a wilting plant would tell the wrong story** | The only one of the four whose planting is untouched, and the reason is the same as era six's raked gravel |
| M8 | **The hazard's own body, and its stages** | **No analogue, and it is the defining absence.** **There is no visible intruder.** No agent, no marker, no trail, no icon. The source is a fact about a building's status and the only way to learn it is to read a panel. Section 4.2 | Section 4 |
| M9 | **Propagation, and its leading edge** | **No leading edge, because nothing spreads visibly.** A wrong isolation **relocates** the source, and what the player watches is not motion but **their own readings going stale**. Section 4 | Section 4.4 |
| M10 | **The counter-mechanic as an object** | **Two verbs and they are asymmetric**, which is the crisis. **The diagnostic** is a lifted cover with a panel above it and a collar on a duct marker. **The isolation** is flush blanking panels, a corner plate, and the panel going dark. Section 5 | The only crisis of the four where the player's main verb changes nothing on the board except what they know |
| M11 | **Its own states** | A cover closed, and a cover **lifted and leaning with its barrier**. **The cover stays up for the rest of the crisis**, which turns the floor into a record of everywhere the player has looked | Plate `02`. It is the same job era two's searched-ground course does, in era nine's own material |
| M12 | **Aimed coverage** | **A diagnostic covers one building, and at the top rung one next to it.** No footprint, no area, no radius | Era one aims at ground; era nine aims at a building and gets a sentence back |
| M13 | **Pre-commit preview** | **Era nine INVERTS the preview discipline and this is the row that matters most.** It cannot show what a reading will find, because that is the thing being hidden. **It shows what the reading will cost, what it will cover, and how good it will be.** Section 5.3 | The only crisis of the four whose preview is about the action rather than about the board |
| M14 | **Duration** | **No analogue.** Nothing era nine places expires. A lifted cover stays up, an isolation stays until lifted | The only expiry in this crisis is the **budget**, which is a count and not a duration |
| M15 | **Protection** | **No analogue as a shield.** Isolation is not protection: it is a bet. **Getting it wrong costs the clean building's capacity AND makes every reading stale**, so it is the opposite of absorbing harm | Era one spends to absorb; era nine spends to commit |
| M16 | **The threatened building** | **No analogue, and the absence is the crisis.** **Unknown must be a positive state** or the board looks empty rather than uncertain: an unread building carries **a lit but blank matrix**, which says *nobody has looked here* | Section 4.3. This is the single most important row in era nine's inventory |
| M17 | **Accumulating damage short of destruction** | **No analogue.** Nothing accumulates on a building. **What accumulates is the player's evidence**, and it accumulates in the wrong direction: a wrong isolation makes all of it stale at once. Section 5.4 | The only crisis of the four where the thing that degrades belongs to the player rather than to the city |
| M18 | **The ruin** | **No analogue.** Era nine suspends capacity and relocates a source; it destroys nothing | Section 6 |
| M19 | **Ground lost for good** | **No analogue.** No ground is scarred. **But some covers stay up if the crisis ends unsolved**, and that is the nearest thing: the pattern stays broken where the player did not finish | Section 9, and it is legible from any zoom without a panel |
| M20 | **Repair and rebuild** | **No analogue as a bill.** An isolation lifts when the player clears it, if clearing is ruled at all (section 10) | |
| M21 | **Giving ground up, and buying it back** | **No analogue.** No ground changes hands | |
| M22 | **The accuracy ladder read off the board** | **The segment count on the panel is the ladder**: one segment, two with the second at half height, three. **The half height is what makes "likely" read as hedged without a word** | The only ladder of the four that expresses **confidence** rather than **magnitude**, and it is protected by D-CRISIS-22 |
| M23 | **Ambient motion** | **Almost nothing, and what does move is data.** A panel's readout updates when the player learns something, **on a player action and never on its own**. The rooftop chillers turn slowly. Nothing else. Section 8 | The only crisis of the four whose motion carries information |
| M24 | **The conclusion** | A standalone sheet with a derived verdict, per D-CRISIS-30. **It has to report an unsolved ending well**, because era nine is the only one of the three solve-it crises that gains a budget it did not already have | The only conclusion of the four whose ordinary bad ending is *"you ran out of questions"* |

**Twelve rows say "no analogue" and that is the highest count of the four**, which is what an
invisible crisis looks like when it is audited honestly. **The two rows that carry the whole crisis
are M13 and M16**, and both are about information rather than about objects.

---

## 2. The read, in one sentence a modeller can check against

*The same immaculate sealed town late in the day with its floor open in a dozen places, barriers round
every opening, and a lit panel by every door showing something nobody wants to read.*

**That sentence is `crises/era-09-intrusion.md` §2.8's and it is not improved on here.** Plate
`01-wide-master` is the frame that either satisfies it or does not.

---

## 3. The light, and the ground it falls on

### 3.1 The light, and why it is not night

**Late, flat and colourless, with the town's own panels the only live things in the frame.** Neutral
grey key well down in intensity, low and flat so the shadows are long and soft across a precise floor,
a flat cool grey sky slightly darker than the other three briefs' skies, and the far plane pulled in a
little so the town is legible and the world beyond it is indistinct.

**Why not night, and this is the trap in this preset.** A dark scene would make era nine's lit panels
look wonderful and **it would be a lie**: those panels light nothing, so a night scene would be bright
rectangles floating in blackness with no falloff anywhere, which reads as **broken** rather than as
atmospheric. **A dimmed, flat, late afternoon keeps the town readable and still lets the emissive
panels be the brightest thing.**

**Three notes on top of `crises/era-09-intrusion.md` §2.1's lever table, which is not restated.**

- **`exposure` is era nine's most useful new control** and that brief could not know it existed. Era
  one's preset runs 0.92 to pull the top end down after ACES. Era nine wants it lower still: **the
  panels have to be the brightest thing in the frame, and dropping the whole frame's top end is a
  cheaper way to get there than raising the panels**, which risks era one's flat-orange-square defect.
- **`shadowIntensity` should stay near era one's**, because era nine wants long soft shadows present.
  It is the only one of the four that does. Era four wants them hard, era six wants them gone.
- **The rim light is not optional here.** Era nine's buildings are flat sealed planes in a body and an
  accent that sit close together on purpose, so **the rim is the only thing separating one building
  from the next.** It is the one lever in this preset that must not go down.

### 3.2 The ground, which is where this crisis lives

**Era nine's guide says the inspection covers are *"part of the pattern rather than apologised for"***,
squared to the module and aligned to the joints. **So lifting them breaks the pattern, and for the era
whose whole identity is a sealed unbroken surface, a floor with its covers up is the loudest possible
statement.**

**That one observation is the answer to the hardest atmosphere brief of the four**, and it is worth
saying why it works: era nine's crisis is invisible by design, nothing burns and nothing falls over, so
there is no hazard to draw. **The only thing available is the town's own response to it**, and the
town's response is to open its floor.

Two changes and both are era nine's own vocabulary:

- **The covers are up.** Lifted and leaning, service voids open, **temporary barriers around each
  opening** in era nine's own matched-enclosure language. **A precise banded pattern with holes in it
  is the crisis, and it is one prop repeated.**
- **The duct and fibre markers read.** Era nine's kit has flush duct and fibre markers set into the
  paving, and the crisis makes them the trace: **the markers along the routes the intrusion has been
  found on carry a raised collar.**

#### 3.2a The barrier's tone, ruled 2026-08-01, because three documents disagreed about it

**"Matched-enclosure language" is the whole instruction and it was too indirect to hold.** The
barrier is the era's added clad panel, `#8B959C`, the same material as the blanking plates over an
isolated building's openings, with its posts in the face model's right face `#646B70`. It is
authored once as `$ERA9.Clad` in `tools/generate-winter-crisis-references.ps1` and read by both
primitives, so the barrier and the blanking plate cannot drift.

**What was wrong before this, and it was the plates.** They drew the barriers in a rust orange,
`#B8593A` posts under a `#C9663F` rail, the warmest thing in any intrusion plate. Against that,
`crises/era-09-intrusion.md` (merged, and the authority for this surface) lists a lifted cover's
colour as **`none`** in its non-colour-carriers table at line 678, and says of the palette at line
142 that **"warmth is foreign to it"**. The pack's constraint list says *"no urgency framing, no
alarm, no red"*.

**The rust orange had a real case and it is worth stating before dismissing it.** A
high-visibility barrier round a lifted floor cover reads as *maintenance and works in progress*
rather than as alarm, which is the correct register for this crisis, so the possibility taken
seriously here was that **"no colour" was the over-absolute rule rather than the plate being
wrong.**

**What decided it is what era nine's palette already spends its tones on**, on the method that
settled era one's threat mark: read the existing meanings first and let them decide, rather than
argue from convention. Measured on blue-minus-red over every tone in the pack:

| Family | Tones | Blue minus red |
| --- | --- | --- |
| **Ground** | `Floor`, `Deep`, `Kerb`, and every cover and collar tone derived from `Floor` | 8 tones, **-15 to -9** |
| **Built and added** | `Body`, `Glass`, sky, haze, water, and all fifteen of the crisis's own marks (panel bezel, face, rim, segments, stale bar, void, collar notch, blanking plate, isolation plate) | 19 tones, **+6 to +41** |
| **The rust barriers** | `#B8593A`, `#C9663F` | **-126 and -138** |

**Twenty-seven tones in a clean split, and it is era nine's own ruling rather than a coincidence.**
Its style guide keeps the paving *"warmer or darker than the body hue, not cooler"*, because era
nine's wall is already cool and every pale era before it was told the opposite. **So in era nine,
warm means floor.** The rust barriers sat 111 points outside that band on the warm side: they said
*floor* in the era's one committed tone language, at the single object whose whole job is to say
*this floor is open here*.

**Era one settled two tone questions this way and both are the precedent.** Its threat badge takes
the ice front's own blue *"on purpose rather than by coincidence: the island's legend already
glosses that swatch as 'the ice front: where it reaches this round', and a threatened building is
exactly a building the ice front reaches this round"*
(`apps/web/src/city/three/CrisisStatusMarker.tsx:57-60`), and the shipped prompt sheet carries **no
amber** as a hard negative for the same reason. And a whole per-tier table of preview blues was
retired because *"three of the four were BLUES, which is the winter's own colour in this scene ...
so the marker for the one action that pushes frost back was drawn in the language of the thing the
player was losing to"*; era one's one warm ground swatch is `warded` (`winterTones.ts:81`), which
means ground a fire is holding, so a warm marker there would have read as *safe*
(`winterTones.ts:128-137`). **Neither argued from convention. Both read what the palette already
meant and let it decide, which is exactly what the table above does.**

**And era nine's crisis has no colour channel to spend, which is the second half.** Every one of
its four readings is carried by segment count, relief and value against a uniformly low-chroma
field. Saturation across the pack's 25 material tones tops out at **0.297**, which is `Glass`, the
era's own accent. The barriers were at **0.838 and 0.843**, so the pack's only saturated tone was
being spent on the one mark that carries no information at all: every lifted cover has a barrier,
so it distinguishes nothing.

**The read is not lost, and this is the measurement that makes the ruling safe rather than merely
principled.** Value separation from the floor goes from **0.197** (the rust post) to **0.229** (the
clad post), so the barrier is a *wider* step on value than it was and only the chroma is gone. The
void under a lifted cover stays the darkest thing on the paving at **0.031** against the floor's
**0.373**, a gap of 0.342, wider than any other pair in the frame. **So the hole is still the
subject**, which is what §3.2 asks for and what a barrier louder than the opening was quietly
taking away.

**What this does not change.** The barrier is still one prop repeated, still round every opening,
and still the second carrier of a completed diagnostic beside the panel and the collar. Era nine's
hard negatives are untouched and strengthened: no visible propagation, and nothing that reads as an
alarm.

**What this is not, and it is the collision worth guarding.** These are **not links in era six's
sense** and era nine has **no edge layer**. They are marks on the ground that say *where evidence was
found*. **Era nine's hidden state is per building, not per connection**, and drawing a network would
import era six's topology into a crisis that does not have one. Section 4.4.

**The floor is solid and you cannot see down through it.** Era nine's paving is **on structure** and
era ten's is a **deck** you can see down through, and that distinction is the one era nine hands to era
ten and must not spend: **no grille, no grating you can see through, no gap.** **The inspection covers
are covers: they are closed, or they are lifted with the void beneath them dark.** If a player can look
down and see servicing, this is era ten.

**The reach question.** Under #298 (still open, so still a design figure) era nine's buildable radius is
65, past the drawn grass at 30 **and past the lagoon at 58**. **The ground layer must clip to the drawn
island.**

### 3.3 Water and vegetation, which do not change

**No change to either, and both absences are deliberate.** The shoreline is engineered and the
intrusion is not physical. The planting is engineered and stays exactly as it is, because **a systems
failure inside a town that is still being maintained perfectly is the whole picture** and a wilting
plant would tell the wrong story.

**One exception, and it is the era's best joke on itself.** Era nine's props kit carries **a pavilion
that is really a pump house**, described as *"a small clad box with a glazed face and no door on the
side you can see, which is the era's habit in miniature"*. **In the crisis its door is open**, on the
side you can now see.

---

## 4. THE PROPAGATION VISUAL, which is an absence and has to be designed as one

### 4.1 What propagates, and along what

**Compromise propagates, and it propagates along nothing the player can see.** Status is hidden per
building. A wrong isolation **relocates** the source. There is no front, no route, no trail and no
schedule.

**So the honest statement of era nine's propagation visual is that there is none, and that the crisis
therefore has to draw the player's KNOWLEDGE instead.** That is not a dodge: it is the axis
D-CRISIS-33 brought era nine into the set to own, and it is the one thing none of the other three has.

### 4.2 The source is never drawn, and that is a rule

**There is no visible intruder in this crisis.** No agent, no marker, no trail, no icon.

**This is worth stating as a rule because the temptation to draw something is strong**, and anything
drawn would either give the answer away or be decorative. **The board's entire content is what the
player has learned.**

**A consequence for an artist: the first instinct on this brief will be wrong.** Every other crisis in
the game gives you an antagonist to design. This one gives you an instrument.

### 4.3 Unknown as a positive state, which is the row the whole board rests on

**The board must answer four questions and the first one is the hard one:** which buildings have been
read, and which have not. **Unknown must be a positive state, or the board looks empty rather than
uncertain.**

**An unread building carries a lit but blank matrix.** Lit, so it is clearly working and clearly
saying nothing. Blank, so it is clearly not a reading. **A building with no panel at all would read as
outside the crisis**, and a building with a dark panel means something else entirely (section 5.2).

**The four readings, and none of them is colour.** Plate `03-status-panel-four-readings`:

| Reading | On the panel | Second channel | Third channel |
| --- | --- | --- | --- |
| **Unread** | **A blank matrix**, lit but empty | No collar on its duct marker | The rail lists it as unread |
| **Clear** | **One segment lit**, at the left | A **flush collar** on its duct marker | Rail text |
| **Likely compromised** | **Two segments lit, the second at half height** | A **raised collar**, single | Rail text |
| **Compromised** | **Three segments lit**, full height | A **raised collar, doubled** | Rail text |

**The segment count is the primary read and it is countable** in greyscale, at any zoom where the panel
is visible at all, which is what INV-CRISIS-16 wants. **The half height on the middle reading is what
makes "likely" read as hedged** without needing a word, and it is the only place in the four packs
where a partial magnitude is drawn.

**The duct-marker collar is the zoomed-out channel and it is not a nicety.** A panel by a door
disappears at full zoom-out; a collar on a ground marker does not. **Two carriers at two distances is
what makes this board readable at both**, and plate `04-two-distances` exists because that claim is not
decidable in prose: it needs a frame with a near building and a far one in it.

### 4.4 How it reads differently from the frost, and from eras four and six

The four-way table is at `crisis-reference-packs/README.md` section 4. Era nine's row, argued:

**Against the frost.** The frost is an **edge on the ground** and the player watches it move. **Era
nine's board has nothing on it that moves and nothing on it the player did not put there.** In era one
the player looks at the world and reasons about it; in era nine the player looks at their own notes.
**The visual test: era one's board is full before the player acts and era nine's is empty.**

**Against era four.** Era four's board is **fully known and getting worse**: every district's
allegiance is visible from the first cycle and the pressure comes from the cost of acting. **Era nine's
is mostly unknown and the pressure comes from ignorance.** Those are opposite failure modes: era four
punishes hesitation and **era nine punishes impatience.** That inversion is deliberate and it is the
sharpest pairing in the set, so **the two must not share a visual grammar**: era four's marks say who
holds what, and era nine's say what the player has found out.

**Against era six.** This is the collision worth watching, because both hide something. **Era six hides
what has travelled along a visible network; era nine hides the status of a known thing and has no
network at all.** Held to, they are: *read the graph and cut it* against *read the board and pay to
know more*. **Two rules follow and neither is optional.** Era nine must never be given an edge layer,
because the duct collars are marks about places and not lines between them. And era six must never be
given a confidence grade, which D-CRISIS-22 protects by reserving the hedged reading to era nine.

**One sentence to carry into a review:** era nine is the crisis where the board is what the player
knows, and the only thing that ever gets worse is the accuracy of their own notes.

### 4.5 The stale reading, which is the crisis's sharpest moment

**When a wrong isolation relocates the source, every reading goes stale.** The board must show that
**without deleting what the player learned**, because *"you knew this and it no longer counts"* is the
experience the ruling is about.

| Element | Before | After a relocation |
| --- | --- | --- |
| **The panel** | Segments lit | **The same segments, with a bar drawn under them**, and the face dropped to about half. **It still shows what it showed** |
| **The duct collar** | Raised | **Raised, with a cut notch across it** |
| **The rail** | *"Compromised."* | *"Compromised, read before the last isolation."* |

**Keeping the old reading visible and marking it stale is better than blanking it, for two reasons.**
It is more informative, because the player can reason about what has changed. And it is more honest
about what the mechanic did.

**Plate `05-stale-reading` puts a live reading and a stale one side by side**, because the question it
settles is not decidable in prose: whether a bar under three segments at half brightness still reads as
*three* rather than as *something went wrong with the panel*.

---

## 5. The player's own marks, which are asymmetric

### 5.1 The diagnostic, which changes nothing except what the player knows

**Lifting a cover and reading what is under it.** The mark of a completed diagnostic is: **the cover
lifted and leaning**, with its barrier round the opening; **the building's panel showing a reading**;
and **a collar on its duct marker.**

**The cover stays up for the rest of the crisis**, which turns the floor into a record of everywhere
the player has looked. That is the same job era two's searched-ground course does, in era nine's own
material, **and it is the one thing in this crisis that accumulates visibly.**

**Plate `02-lifted-cover-and-barrier` settles the object**, because *"a broken pattern"* is a claim
about a floor and not about a prop: a closed cover and a lifted one have to be shown in the same
paving for the break to be visible at all.

### 5.2 The isolation, which is the heavy verb

**Isolating a building:** flush blanking panels in the curtain-wall module over its openings, which is
**the era's sealed skin turned against itself**; a corner tag, which for era nine is a **service
isolation plate**, a small angled panel with a single cut bar; **its status panel goes dark**; and its
capacity is suspended.

**The dark panel is the strongest statement available to this crisis and it costs nothing.** In a town
where every other panel is lit, the one that is not is unmissable, **and it is the absence of an
emissive lift rather than the addition of anything.**

**One thing the dark panel must not be confused with, and it is the only ambiguity in the set.** An
**unread** building has a **lit blank** panel and an **isolated** one has a **dark** panel. Those are
the two states most likely to be conflated by a viewer and they mean opposite things: *nobody has
looked* against *this building is switched out of the town*. **The blanking panels over the openings are
what disambiguate them**, and a treatment that dropped the blanking panels and kept only the dark
readout would make the board unreadable.

**If it was the source, the crisis ends. If it was not, the capacity is suspended anyway and every
reading goes stale.**

### 5.3 The preview inversion, which shapes the whole surface

**INV-CRISIS-10 guarantees the player can always see what an action would do before committing. Era
nine's axis is that the player cannot see the board.** The crisis spec is explicit that those are
different unknowns and must not be confused:

> **The cost of an action must still be legible even when its target is not.**

**So era nine's read-out is unlike the other three.** It cannot show what a reading will find. **It
shows what the reading will cost, what it will cover, and how good it will be.**

**The consequence for the board rather than for the panel**, which is this brief's half of it: **there
is no provisional mark on the island for a diagnostic**, because a diagnostic has no effect on the
island to preview. **The only provisional mark in era nine is for an isolation**, and it is the outline
convention the other three use: an outline of the blanking panels rather than the panels.

**And the isolation's confirmation is a two-stage control**, which only era five's demolition and this
get. One control, two presses, the consequence written on the second: *"Yes, isolate it. If this is
wrong, the source moves and every reading goes old."* **That second label is the whole ruling in one
sentence** and it is the last thing the player reads before finding out.

### 5.4 The budget, and the one number that is not invented

**Era nine's budget is diagnostic actions**, displayed in the era's own idiom: a totem panel in the rail
carrying a count in the same matrix style the building panels use. **So the budget and the readings
share a visual language, which is correct: both are the same instrument reporting.**

**The size of the budget is not specified anywhere and is not guessed here.** Carried as O-18 and in
section 10. **A budget so tight that ending unsolved is the ordinary result is a different game from
one where it is the price of impatience**, and the difference is a tuning decision.

---

## 6. The building states, as a treatment

**Three states and a declared absence.** Plate `06-building-states` draws the three.

| State | Treatment | Channels |
| --- | --- | --- |
| **Untouched** | The building as authored, with a **lit blank panel** if unread or a **one-segment panel** if read clear | The panel is always present for the duration, so "untouched" is never "unmarked" |
| **Affected: compromised, still working** | **Three segments on the panel and a raised doubled collar on its duct marker.** Nothing about the building itself changes | **This is the row a designer will want to strengthen and must not.** A compromised building is working normally: the whole crisis is that you cannot tell by looking at the building |
| **Affected: isolated** | **Flush blanking panels** over the openings in the curtain-wall module, a **service isolation plate** at the front lower corner with a single cut bar, and **the panel dark** | Silhouette change across the elevation, plus the corner plate, plus the absence of light. Three channels |
| **Ruined** | **There is no ruined state in this crisis.** Era nine suspends capacity and relocates a source; it destroys nothing | See below |

**The second row is the one to hold the line on.** Every instinct says a compromised building should
look wrong. **It must not.** If a compromised building were visibly different from a clear one, the
diagnostic would be pointless and the crisis would have no axis. **The compromise lives on the panel
and on the ground marker, and nowhere on the building.**

**Why there is no ruin, stated as a rule.** `crisis-damage.ts` holds exactly `ruined_buildings`,
`ruined_cells` and `suspended_civic`, and era nine's consequence lands in the third. **No ruin asset may
be authored for era nine.**

**And this treatment must not converge with a ruin, which in era nine is easier to get wrong than
elsewhere.** A ruin has lost its silhouette; an isolated building has **gained** panels and kept
everything else. **The blanking panels are flush and in the building's own module**, so an isolated era
nine building reads as **sealed** rather than as **boarded**, which is the distinction from era six's
timber shutters and is the era's own material doing the work.

---

## 7. The plate set

Six. `crisis-reference-packs/intrusion/README.md` carries the reading key and the prompt sheet.

| Plate | The visual question it settles |
| --- | --- |
| `01-wide-master` | Whether an **invisible** crisis is legible at the fixed camera at all, and whether the one-sentence read in section 2 is satisfiable |
| `02-lifted-cover-and-barrier` | Whether one lifted cover carries the crisis on its own, and whether the **break in the pattern** is visible rather than merely present |
| `03-status-panel-four-readings` | Whether four readings are **countable in greyscale** at the game's zoom, and whether a half-height second segment reads as hedged |
| `04-two-distances` | Whether the same fact survives full zoom-out. The panel stops being countable and **the collar has to carry it**; if it does not, era nine has no zoomed-out board |
| `05-stale-reading` | Whether a bar under the segments at half brightness reads as *still three, no longer current* rather than as a broken panel |
| `06-building-states` | Untouched, compromised-and-working, and isolated, with the middle one **deliberately indistinguishable from the first on the building itself** |

**Six, and three of them exist because this crisis is invisible.** Era one's hazard, ground and
water-boundary plates have no subject here. What earns a plate instead is information: how a reading
reads, how it reads at two distances, and how a reading that no longer counts reads without being
deleted.

---

## 8. What moves, and the rule motion obeys

**Almost nothing, and what does is data.**

- **The display panels change.** Era nine's guide describes the panel as *"showing a number that
  changes"*, and in the crisis a panel's readout updates when the player learns something. **It changes
  on a player action and never on its own**, which is both the clockless rule and the more useful
  behaviour.
- **The rooftop chillers turn**, slowly. The one mechanical motion, and it matters: **the machinery is
  still working**, which is the point of the whole crisis.
- **Nothing else moves.** No people, no vehicles.

**The rule: nothing that moves may advance the encounter.** Era nine is the crisis where this is
easiest to break by accident, because **its motion carries information**: a panel that updated on its
own would be the crisis telling the player something they did not pay for, which is the axis giving
itself away. **A panel changes when the player acts, and at no other time.**

**Every animation is gated on `prefers-reduced-motion`**, and under that setting **a panel holds its
posed readout** rather than disappearing. **The test for any proposed motion: screenshot it at a random
moment and ask whether the board still reads.**

---

## 9. The transition, in and out

**In:** the lighting preset, the flat cool grey sky, **the covers coming up across the town**, the
barriers going round them, the status panels going from their ordinary readouts to blank diagnostic
ones, the pump-house door opening.

**What never changes:** the buildings, the paving pattern itself, the planting, the island's geometry,
the shoreline.

**Out, and era nine's exit is the best of the four**: the covers go back down and **the pattern
closes.** The whole crisis was a broken pattern and the ending is the pattern restored, which is a
better ending than any of the other three gets for free.

**If it ends unsolved, some covers stay up**, and the buildings whose capacity is suspended keep their
blanking panels. **The pattern stays broken where the player did not finish**, which is legible from any
zoom without a panel and which is era nine's version of a persistent consequence. **It is the only one
of the four whose unsolved ending has its own picture**, and D-CRISIS-26 makes that a requirement rather
than a nicety: a crisis may end unsolved with the damage standing, so the screen and the island both
have to be able to say so.

---

## 10. Owed, and deliberately not invented

**No tuning number is guessed anywhere above**, per §1 of the crisis design spec.

> **CLOSED 2026-08-01: the barriers' tone.** It was owed here and on the prompt sheet, on the
> ground that the plates' rust orange, this brief's *"matched-enclosure language"* and the pack's
> *"no alarm, no red"* could not all be the direction. **It is ruled in §3.2a**, against what era
> nine's palette already spends its tones on rather than against convention, and propagated to
> all three places: this brief, `tools/generate-winter-crisis-references.ps1` (plates `01` and
> `02` regenerated), and
> `output/imagegen/era-09-intrusion-crisis-scenes/README.md`.
> `test/intrusionPlateTones.test.ts` holds it.

1. **The size of the diagnostic budget.** Carried as O-18. **A budget so tight that ending unsolved is
   the ordinary result is a different game from one where it is the price of impatience.** **Team
   lead**, and it is the single most consequential open number in this crisis.
2. **Whether the top rung widens rather than sharpens.** D-CRISIS-22 protects the partial credit at the
   bottom of the ladder and does not specify the top. `crises/era-09-intrusion.md` §4.2 draws it as a
   firm reading on the building asked about **and one next to it**, which is a widening. **If it
   sharpens instead, the four-reading table in section 4.3 is unchanged and the plate is unchanged**,
   which is worth saying: this question does not block the art. **Team lead.**
3. **Whether a wrong isolation can be cleared.** `crises/era-09-intrusion.md` §6.1 lists a third action
   and says it is not ruled. **Without it, a wrong isolation is permanent for the rest of the crisis,
   which may be intended.** It decides whether the blanking panels ever come off mid-crisis. **Team
   lead.**
4. **How many buildings carry a panel, and whether every building does.** Section 4.3 assumes every
   building carries one for the duration, because unknown has to be a positive state. **If the count is
   large the panels become the dominant visual element of the town**, which is a real risk at era nine's
   building count. **Whoever authors era nine's land**, which is Evan's lane, plus a check in a render.
5. **What emissive intensity the panels run at.** Era one's flame ramp is the cautionary precedent: a
   single high value clips the facets and loses the form. **The panel is small and flat so it is less
   exposed, but the bezel and the face must not both be lifted.** It is a number and it has to be
   judged in a render rather than chosen on paper.

---

## 11. References

- `crises/era-09-intrusion.md`: the merged presentation brief. **The authority for the surface, the
  layout, the copy and the accessibility table, and not superseded by this document**
- `crises/README.md`: the renderer boundary, the carrier set, the shutter plate, the copy rules, and
  the note that era nine's signature reflective skin is unrenderable
- `crisis-reference-packs/README.md`: the mechanic inventory's derivation, the propagation reading, the
  pack conventions, and the four corrections to the shared boundary at this tip
- `crisis-reference-packs/intrusion/`: the six plates, the reading key and the prompt sheet
- `2026-07-29-mid-era-crisis-design.md`: D-CRISIS-1 (the axis), **D-CRISIS-22** (the protected hedged
  reading), D-CRISIS-26 (a crisis may end unsolved), D-CRISIS-33 (the set of four), and INV-CRISIS-1,
  10 and 16
- `2026-08-01-hard-winter-art-brief-addendum.md`: the same inventory run over era one, and what it
  turned up
- `eras/era-09-information/style-guide.md`: engineered paving on structure, the inspection cover as the
  island's most characteristic object, the no-deck rule era nine hands to era ten, the body hue
  `#96A1AB`, and the props kit including the illuminated matrix panel and the pavilion that is a pump
  house
- `docs/Game_Visual_Design_Brief.md` §2 and §4: the tone bans and the locked art direction, including
  the reserved meaning colours. **Read as binding and not amended here**
- `apps/web/src/city/three/winterGround.test.ts`: the emissive guard and its two-directional
  exemption, which is the precedent era nine's panel rests on
- `apps/web/src/city/three/winterFire.ts`: the heat-ramp lesson, which is why a panel's bezel and face
  are not both lifted
