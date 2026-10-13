# The Succession Crisis: design and asset brief

**Era:** 4, Classical
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era four's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

---

## 0. The hard boundary

**Read `./README.md` first.** The four that bite hardest on era four:

1. **Nothing tints a building at runtime.** This crisis is *about* buildings changing hands, and the
   obvious way to draw that is to colour a building in a faction's colour. **That path does not
   exist.** `faceTones()` is called by nothing but its own test, and a building's colour is baked
   into its GLB. **Allegiance is drawn with added geometry**, and section 3 spends most of its
   length on how.
2. **Four global lights, no local light.** Braziers burning in a contested district cannot light it.
3. **No image textures.** No painted proclamations, no chalked marks on the paving, no banner cloth
   with a device printed on it. Every mark is geometry or it is in the DOM.
4. **No environment map.** Era four's marble and its polished ashlar can be pale and faceted. They
   cannot be polished.

## 0b. What is available

Procedural geometry; silhouette as the channel that survives zoom-out; flat colour per mesh and
per-vertex colour; flat shading; emissive as a bright face up to about 1.35; `useFrame` animation
gated on `prefers-reduced-motion`; the shared ground-decal ladder; and the nine lighting numbers
plus sky and fog, which change the whole island for one table row.

---

## 1. The crisis, and what the player does

**The premise, in one line.** The city's leadership is in dispute, two claimants are courting the
districts, and every district that has not chosen will choose without you.

**The ritual: I bank and spend political influence.** Era four is the only crisis of the ten with a
**stored resource**. Everywhere else accuracy is spent the instant it is earned: era one's tier
sizes a fire and is gone. Here correct answers become **influence you keep**, and the decision is
when to let it go.

**The cadence: answer repeatedly, bank, then one larger decision.** This is the most distinctive
cadence in the ten and it changes the surface, not just the numbers. **Era four is the only crisis
whose screen has two modes:** a long accumulating phase where nothing is committed, and a
commitment that resolves several districts at once. Section 5 is built around that.

**Duration: solve it.** The crisis settles **when no district remains neutral**. Era four is
deliberately excluded from D-CRISIS-26's action budgets, because the mechanism that creates its
pressure is the same one that guarantees its end.

**The stake: neutral districts drift.** Each cycle the player does not commit, **an undecided
district picks a side on its own, and it picks whoever is currently strongest**. So waiting
compounds: the longer influence is held back, the stronger the position it will have to be spent
against.

**What this charges for is hesitation, not error.** Nothing else in the ten charges for declining to
act, and era four is the crisis whose axis is allegiance, where refusing to choose is the
characteristic mistake. **The presentation's whole job is to make hesitation visible before it costs
anything**, which is what section 3.4 is for.

**A cycle advances on player actions and never on elapsed time.** This is INV-CRISIS-1 applied to the
one mechanism in the design that invites a timer. **What counts as an action is not settled** and is
[Q1](#13-open-questions).

**Entry.** After `ceil(n / 2)` of era four's five nodes (`POL.1`, `POL.2`, `POL.3`, `POL.4`,
`POL.8`), which is **three**.

### The floor, which is sharper here than anywhere else

**Factions may hold civic buildings only.** A faction taking a **skill** building would breach
D-CRISIS-7's *always preserved* list outright, because a skill building is the record of a completed
lesson. Contested civic capacity may be suspended; ownership of a lesson may not change.

**For an artist this is a hard rule about which models ever receive a claim marker.** The four civic
types can. The era's five skill buildings and the hub cannot, and no marker asset may be authored
that fits one.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the city is in dispute.

**The hard part, stated honestly.** Era four's crisis has no weather, no fire and no hostile
walking up the road. **The whole atmosphere shift has to be carried by a city that has stopped
working**, and that is a subtler brief than eras three, five or eight. It is also cheaper, because
almost all of it is re-posing props the era's kit already has.

**The constraint:** era four's floor in the ground ladder is the **paved floor**: fitted stone laid
to a regular bond with the joint lines running through, cambered, kerbed and guttered, worn smooth
along the desire lines. **None of that changes.**

### 2.1 The light

**The direction: high, hard and still.** Era four is the era that set the island out to a line, and
the crisis should read as that order becoming brittle rather than as weather arriving. A flat hot
noon with short hard shadows is the correct read, and it is the opposite of era three's long dawn,
which is worth having in a run of ten.

| Lever | Era four's day preset today | Succession direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Cooler and whiter.** Era four's limestone is already pale; taking the warmth out of the light takes the welcome out of the city |
| Key intensity | 1.32 | **Up slightly.** Hard light is the point |
| Key angle | Low and raking | **High, close to overhead.** Short hard shadows, no long rakes. This is the single most identifying lever and it is the reverse of era three's |
| Hemisphere sky | `#CFE6F6` | Paler, and lower in chroma |
| Hemisphere ground | `#C08F57` | **Cooler.** The bounce off a paved floor is stone, not earth, and this is the era where that becomes true |
| Hemisphere intensity | 0.95 | Down. Less soft fill, more contrast |
| Ambient | `#F5EFE2` at 0.30 | Down |
| Rim | `#BFDCEF` at 0.48 | Keep |
| Background (sky) | `#BFE1F2` | **Bleached almost white at the horizon**, holding blue only at the top. A sky with the colour burnt out of it |
| Fog colour | `#D6ECF7` | Match the bleached horizon |
| Fog near and far | `radius x 3` to `radius x 20` | Push the near plane **out**. Era four's crisis wants clarity, not haze: everything is visible and nobody will say what they intend |

### 2.2 Ground

**Era four's ground is one continuous floor and the crisis writes on it with objects, not with
tone.** The era's kit already carries the two objects needed: the **boundary stone** and the
**milestone**.

- **District boundaries** are a run of **boundary stones set along a joint line in the paving**, one
  every few cells, low and square. **They sit on the joint lines the era already has**, which is
  what makes them read as a claim about the city rather than as a graphic laid over it. This is era
  four's signature move applied to the crisis: the module counted along a wall, counted along a
  floor.
- **Nothing fills a district.** A fill would cover the paving, which is the era's whole ground
  identity, and it would make the board read as a map rather than as a city.

**On the reach question, era four opts out by design.** Under
#298 era four's buildable radius is 43
against a drawn grass radius of 30, so a per-cell ground layer would extend well past the drawn
island. **Era four lays no per-cell layer at all**, which sidesteps it. That is a design decision
made partly for this reason and it is recorded so nobody adds one later without knowing.

### 2.3 Vegetation

**The line of limbed-up trees is era four's own planting and the crisis leaves it alone.** A
political dispute does not change what grows.

The one permitted change is at the foot of the trees rather than in them: **the ground beneath the
line has been standing-room**, scuffed and littered, where people have been gathering. Relief on the
decal ladder, no change to the trees.

### 2.4 Water and shoreline

**Era four is a port city and the crisis shuts the port.** This is the largest single atmosphere
change available and it costs almost nothing:

- **Ships stand off, at anchor, not unloading.** Two or three hulls out past the harbour mouth.
- **The quay is clear.** No bales, no sacks on the loading platform, the tall jars gone from the
  paved floor.
- **The public basin still runs.** Era four's kit has it *"running continuously with an overflow
  channel"*, and the one thing that has not stopped is the water. Worth keeping precisely because
  everything else has.

### 2.5 Signs of habitation at the margins

**A city that stopped mid-task**, all of it from the era's existing kit:

- **The treadwheel crane stopped mid-lift**, a numbered block hanging in its sling. The strongest
  single image in the section, and it is already an authored prop.
- **The lime pit skinned over.** Hot lime left standing goes dull, and it says days rather than
  hours.
- **The mason's banker with a part-worked block on it** and the bundle of chisels laid down beside
  it, not put away.
- **The marble slab still ruled out for lettering**, which is the era's own tally prop, standing
  blank. The city is waiting to find out whose name goes on it.
- **Statuary on plinths at two heights**, which the kit already has, and the **empty plinth**, which
  is the crisis's most important object. See section 3.

### 2.6 Does anything move

**Almost nothing, and that is the read.** Era four's crisis is the stillest of the nine.

- **The basin's water moves.** Everything else in the city is stopped.
- **The block in the crane's sling turns slightly.** One small rotation, nearly imperceptible, and
  it is the thing that makes the stopped city read as stopped rather than as unfinished.
- **No crowds, no processions, no marching.** There are no mobile agents in this crisis and it does
  not need them.
- **Every animation is gated on `prefers-reduced-motion`.**
- **Nothing that moves may advance the encounter**, and here that matters more than usual: era four
  has a **cycle**, and a cycle that appeared to turn on its own would read as a timer.

### 2.7 The transition, in and out

**In:** the lighting numbers, the bleached sky, the boundary stones appearing along the joint lines,
the plinths, the port shutting, the crane stopping.

**What never changes:** the buildings, the paving, the kerbs and gutters, the island's geometry, the
shoreline.

**Out:** when the last district decides, **the crane finishes its lift**. That is the exit: the city
starts working again, in one cut, at the resolution panel. **The statues stay**, whoever raised
them, which is the crisis's persistent record of how it went.

### 2.8 The read, in one sentence

*The same port city under a hard white noon, ships standing off, the crane stopped with a block in
the air, and a statue on some plinths and not on others.*

---

## 3. The hazard

**Era four's hazard is not a thing on the board; it is a state of the board.** The antagonist is
**time passing without you**, expressed as districts deciding on their own.

### 3.1 The four questions the board must answer

1. **Which districts are there, and where do they end?** Boundary stones, per section 2.2.
2. **Who holds each one?** The plinth, per 3.2.
3. **Which are still neutral?** The empty plinths, and they are the whole board.
4. **Which is about to drift, and to whom?** Per 3.4, and this is the crisis.

### 3.2 The plinth, which carries allegiance

**Era four's props kit carries an empty plinth and says why it is more useful than a full one:**
*"it can stand anywhere without asserting who is being honoured."* **The crisis is that sentence
made into a mechanic.**

One plinth stands in each district, at its civic centre.

| District state | What stands on the plinth | Second channel |
| --- | --- | --- |
| **Neutral** | **Nothing.** The plinth is bare | The district's boundary stones are **plain squared blocks** |
| **Held by the first claimant** | A **standing figure**, one arm raised | The boundary stones carry a **cut chevron** on their top face |
| **Held by the second claimant** | A **seated figure** | The boundary stones carry a **cut ring** |
| **Contested** | A figure **under a hoist**, in a sling, not yet set | The boundary stones carry **both marks**, and the district's civic building is shuttered (section 8) |

**The two claimants separate by pose, not by colour.** A standing figure against a seated one is a
silhouette difference that survives full zoom-out, which colour on a three-tone body would not, and
which no runtime tint could deliver anyway.

**The cut mark on the boundary stone is the second channel** and it is what makes the allegiance
readable from anywhere in the district rather than only from its centre. It is also era four's own
motif: the era's tally descendant is the carved inscription panel with cut letters, and a cut mark
on a boundary stone is that at its smallest.

### 3.3 The civic buildings

**Only civic buildings can be claimed**, per the floor. A claimed civic building carries a **claim
plate**: a carved inscription panel on a bracket, fixed to the wall beside its door, cut with the
same chevron or ring the district's boundary stones carry.

**It is added geometry and it must be**, because nothing tints a building at runtime. It is also
better than a tint would be: a plate is a silhouette change at the building's edge, and it survives
the zoom the game holds.

### 3.4 The drift warning, which is the most important object in this brief

D-CRISIS-16 charges for hesitation. **A charge nobody sees coming is a punishment, and INV-CRISIS-3's
no-dead-ends principle is about the player always having seen the better move.** So drift must be
visible **before** it lands.

**A district about to drift shows a numbered block waiting at the foot of its plinth**, with the
shear-legs standing over it. Both are era four props. The reading is immediate and needs no legend:
somebody is about to raise a statue here.

- **The block carries the mark of the faction it will go to**, cut into its top face, so the warning
  says *who* and not only *that*.
- **When the drift lands, the block goes up on the plinth.** Same object, moved. The animation is a
  single interpolation on a player-caused advance, never a timed lift.
- **A district with no block at its plinth is not drifting this cycle**, and that absence is as
  informative as the block.

**This one object is what makes era four's stakes fair**, and if only one item in this brief is
built well it should be this.

---

## 4. The player's own mark

**Influence, and it is the first banked resource in the ten.**

### 4.1 The counting board

Era four's kit carries **a marble slab still ruled out for lettering**. The crisis takes it and uses
it as the bank: a slab ruled into a grid, with **stone counters** seated in the ruled cells.

- **Earning influence sets counters into the slab**, filling the ruled cells from one end.
- **Spending takes counters off the slab** and sets them at the district they are spent on, where
  they seat in a socket in the plinth's base.
- **The counters are countable at a glance**, which is the point of a ruled grid, and they carry
  their count in the DOM as well (section 10).

**Why not a number.** A number is the obvious UI and it is worse here: this crisis's decision is
*whether to hold or spend*, and a bank you can see filling makes holding feel like a choice. A
number makes it feel like a stat.

**Whether unspent influence survives the crisis is [Q2](#13-open-questions)**, carried in the crisis
spec as O-6, where the recommendation is that it should not, or it becomes a store of value.
**Presentationally the slab should be swept clean at the resolution panel**, which is the reading
that matches the recommendation and reads as a decision either way.

### 4.2 The three rungs

Accuracy sizes how many counters a batch sets into the slab. Nothing else about it changes: a batch
never fails to earn, per INV-CRISIS-4.

| Rung | What the slab does |
| --- | --- |
| **1 right** | One counter seats |
| **2 right** | Two counters seat |
| **3 right** | Three counters seat |

**This is the plainest ladder in the nine and it should stay plain.** Era four's complexity is in
what the player does with the bank, not in how it fills.

### 4.3 What influence is spent on, drawn

The three uses are ruled in D-CRISIS-4: secure buildings, cancel rival claims, sway neutral
districts.

| Use | On the board |
| --- | --- |
| **Secure a civic building** | A claim plate goes up on the wall, and the building's shutters come off if it was contested |
| **Cancel a rival claim** | The plate on the wall comes **down**, and the block at the plinth is taken off its sling and laid flat |
| **Sway a neutral district** | A figure goes up on the bare plinth, and the boundary stones gain their cut mark |

**Each is a different verb and each looks different**, which is what the option cards in section 6
have to carry.

---

## 5. The crisis surface

**Era four is the only one of the nine with two modes**, and the layout has to say which one the
player is in without being told.

### 5.1 The two modes

| Mode | What the player is doing | What the rail shows |
| --- | --- | --- |
| **Accumulating** | Answering batches, banking counters, watching the drift warnings | The counting board is large and central; district cards are read-only; **the commit control is absent, not disabled** |
| **Committing** | Spending the bank across districts, then resolving | The counting board shrinks to a strip; district cards become actionable; the commit control appears with a running total |

**The commit control is absent rather than disabled in the accumulating mode.** A disabled button
implies the player is failing to meet a condition. Era four's player is not: they are choosing when.

### 5.2 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.**

Rail order in accumulating mode:

1. **Header**: the crisis name, and **how many districts are still neutral**, as a count and a row
   of plinth glyphs, filled or bare.
2. **The counting board**, at its full size.
3. **The drift line**: which district gets a block next cycle, in one sentence.
4. **The district list**, read-only, each with its state.
5. **The control to move to committing.**

In committing mode the counting board shrinks to a one-line strip, the district list becomes cards,
and the commit control appears at the bottom.

### 5.3 At 460

Single column, **board first**. The board crops to the districts rather than to the whole island,
because a district with no visible plinth is not a district the player can reason about.

**The counting board collapses to a strip in both modes at 460**, showing the count and a compressed
row of counters. The full ruled slab is a 920 element.

**The drift line never collapses.** It is one sentence and it is the most valuable line on the
screen.

### 5.4 The hierarchy

**The plinths are the subject.** A player should be able to answer "how am I doing?" by looking at
the island and counting statues, with the rail only telling them what they can do next.

---

## 6. The option cards

**Era four's three actions are three genuinely different verbs**, which is the case era one's four
identical white boxes failed.

### 6.1 The card

428 units wide, about 104 tall (taller than the other briefs' cards, because these carry a cost).

- **A 40 unit action glyph** on the left: a plate going up, a plate coming down, a figure rising on
  a bare plinth.
- **The action name** at 16 units, the target district or building at 14, and a one-line statement
  of what it does at 13.
- **A cost zone**, structurally separate from the rest of the card, carrying **counter pips**: the
  number of counters this action takes, drawn as the same counters the slab holds.

**The cost zone is the lesson from era one's pull-back card**, which had a permanent price and
looked exactly like the three cards that did not. **Cost gets its own zone here, always, even when
it is one counter.**

### 6.2 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2 units, card lifts 1 unit, **no colour change**, and **the district it acts on raises its boundary stones on the board** |
| **Armed** | 3-unit border, corner flag with a check glyph, the word **Chosen**, `aria-pressed="true"`. **The cost zone's pips light on the counting board too**, so the player sees the bank they are about to draw down |
| **Unavailable** | **The reason replaces the cost zone**: *"You have two counters. This takes three."* `disabled`, `aria-describedby` on the reason |
| **Committed** | 6-unit diagonal hatch, the declared line replacing the body |

### 6.3 The one thing this card set must not do

**It must not let the player commit without seeing what drifts next.** The whole mechanism charges
for hesitation, so the surface owes the player the information that makes hesitation a decision
rather than an accident. **The drift line sits above the cards, not below them**, and it is present
in both modes.

---

## 7. The read-out panel

### 7.1 What it is for

Era four's read-out is not a footprint preview. **It is a ledger of a plan that has not been
executed yet**, because the cadence resolves several spends together.

### 7.2 The direction

- **Show the plan as a list of intended spends**, each with its district, its verb and its counters,
  and a running total against the bank.
- **Show what is left over.** If unspent influence does not survive (Q2), leftovers are the most
  important number on the panel and the player must see them before committing.
- **Show what still drifts.** A plan that leaves a district neutral leaves it drifting, and the panel
  should say which one and to whom.
- **Lead with the outcome, not the arithmetic.** *"Three districts decided, one still neutral"*
  before *"7 of 9 counters"*.
- **No dashed borders.**

### 7.3 The provisional register

**A planned spend is drawn on the board as a provisional mark, not a committed one.** A planned
figure on a plinth is **an outline of the figure, raised, not a figure**; a planned claim plate is
**an outline of the plate**. Committed marks are solid. The distinction is era one's and it is
load-bearing: a player must never confuse what they have done with what they are considering.

---

## 8. Damage and consequence

**Era four's consequence is capacity, not ruin.** Nothing in this crisis destroys anything, which is
worth saying because the fiction of a succession dispute suggests otherwise.

### 8.1 Contested civic capacity

A contested civic building **has its capacity suspended** while the dispute over it is unresolved.
It is drawn with the shared **shutter plate**:

| Stage | What is drawn | Channels |
| --- | --- | --- |
| **Held, working** | The building as authored, plus its claim plate | Plate geometry |
| **Contested** | **Shutter plates** over the openings, in era four's own boarding: **squared boards set between the columns of its own bay**, which is the era's signature module doing the work | Silhouette change, plus the **corner tag** |
| **Resolved** | Plates off, one claim plate on the wall | Absence, plus the plate |

**Era four's corner tag** is a **milestone-shaped marker at the building's front corner** with the
contest mark cut into it, from the era's street-furniture kit.

### 8.2 What persists after the crisis

| Thing | After |
| --- | --- |
| **The statues** | **Stay.** They are the record of how the crisis went, and they are the reason it is worth having a persistent object rather than a UI state |
| **The claim plates** | Stay |
| **The boundary stones** | **Go.** They are the crisis's own drawing on the ground and the city does not keep them |
| **Suspended capacity** | Lifts when the district resolves. **Whether a district that resolved against the player keeps its suspension is [Q3](#13-open-questions)** |
| **Unspent influence** | Q2 |

### 8.3 The floor

No building is removed, no node is relocked, no mastery is touched, and no **skill** building is
ever claimed. `crisis-damage.ts` has no field that could record any of those, and era four's whole
consequence lands in `suspended_civic`, which exists as a durable record and which nothing currently
reads into a capacity.

---

## 9. The copy

**Register: results, not purchase, and era four is the hardest case in the nine.** This crisis has a
literal currency, so purchase language will feel correct and it is still wrong where it touches the
player's answers.

**The line to hold:**

- **Counters are spent.** They are a resource, they leave the bank, and "this takes three counters"
  is right.
- **Answers are not.** *"Three correct answers buys three counters"* is wrong. *"Three right, three
  counters"* is right. The answers **earned** the counters; they did not purchase them.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Succession** |
| Entry announcement, heading | **The city has no successor** |
| Entry announcement, body | Two claimants are courting the districts. The ones that have not chosen will choose on their own. You can go when you are ready. |
| Entry announcement, control | **Go to the forum** |
| Header, neutral count | **{n} districts still undecided** |
| Board label | The island. Districts and who holds them. |
| Counting board heading | **Influence** |
| Counting board, empty | Nothing banked yet. |
| Counting board, filled | {n} counters. |
| Drift line | **The harbour district decides next.** Right now it would go to the seated claimant. |
| Drift line, none | No district decides next cycle. |
| Accumulate control | **Answer another round** |
| Move to committing | **Start spending** |
| Commit control | **Commit the plan** |

### 9.2 The cards

| Line | String |
| --- | --- |
| Secure, name | **Secure the {building}** |
| Secure, body | Puts your claim on it. It goes back to work. |
| Cancel, name | **Cancel the claim on the {building}** |
| Cancel, body | Takes their plate off the wall. The building goes back to undecided. |
| Sway, name | **Sway the {district}** |
| Sway, body | The district decides for you, and it stops drifting. |
| Cost zone | Takes {n} counters |
| Unavailable, short | You have {n} counters. This takes {m}. |
| Unavailable, resolved | The {district} has already decided. |
| Armed | **Chosen** |
| Committed | In the plan. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **Your plan** |
| Outcome first | Three districts decided. One still undecided. |
| Spend line | Sway the harbour district. 3 counters. |
| Total | 7 of 9 counters. |
| Leftover warning | 2 counters left over. They do not carry past the end of this. |
| Still drifting | The kiln district is still undecided, and it would go to the standing claimant. |

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
| Last question | **See what you earned** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

**Note the last-question label.** *"See what you earned"* is the register this whole ruling is about
and it is doing real work in the crisis that has a currency.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Three right | 3 right. Three counters on the board. |
| Two right | 2 right. Two counters on the board. |
| One right | 1 right. One counter on the board. |
| None | 0 right. No counters this round. |
| Drift landed | The harbour district decided while you were banking. It went to the seated claimant. |
| Sway landed | The kiln district is yours. |
| Cancel landed | Their plate is off the {building}. |
| Contest resolved | The {building} is back in use. |
| Settled, favourable | **It is settled.** Most of the city went your way, and the statues are up. |
| Settled, mixed | **It is settled.** Some districts went the other way. Their statues stay where they are. |

**None of these narrates the stakes back at the player**, and the mixed outcome does not tell them
they did badly. It says what the city looks like now.

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.**

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| District neutral | none | **Bare plinth**, plain boundary stones, text line |
| District held, claimant one | none | **Standing figure**, **cut chevron** on the boundary stones, text |
| District held, claimant two | none | **Seated figure**, **cut ring** on the boundary stones, text |
| District contested | none | **Figure in a sling under a hoist**, both marks on the stones, shuttered civic building, text |
| District drifting next | none | **A numbered block at the foot of the plinth**, with the faction mark cut into it, plus the drift line in the rail |
| Civic building claimed | none | **Claim plate** on the wall (geometry), text |
| Civic building contested | none | **Shutter plates**, **corner milestone tag**, text |
| Planned spend | outline | **Outline rather than solid**, plus the plan list in the read-out panel |
| Counter in the bank | none | **Count**, position in the ruled grid, and a number in the DOM |
| Card armed / unavailable / committed | border | Corner flag glyph; reason text replacing the cost zone; diagonal hatch |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| District, neutral | `The harbour district. Undecided. It decides next cycle, and right now it would go to the seated claimant.` |
| District, held | `The kiln district. Held by the standing claimant.` |
| District, contested | `The forum district. Contested. Its basilica is closed while the claim is disputed.` |
| Plinth | `The harbour district's plinth. Bare.` |
| Drift block | `A block waiting at the harbour district's plinth, cut with the seated claimant's ring.` |
| Counting board | `Influence. Seven counters banked.` |
| Sway card | `Sway the harbour district. The district decides for you and stops drifting. Takes three counters. You have seven.` |
| Sway card, short | `Sway the harbour district. Unavailable. You have two counters and this takes three.` |
| Claimed civic building | `The Bath House. Held by the standing claimant, and working.` |
| Contested civic building | `The Bath House. Contested, and closed. Its livability is suspended until the claim is settled.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **Drift is the crisis's whole pressure and it is carried by a small object at the foot of a
  plinth.** It must be a sentence in the header region, present at all times, and it must be
  announced politely when it changes.
- **A cycle turning is silent.** When a district drifts, it goes in a polite live region: *"The
  harbour district decided while you were banking."*
- **The bank is a picture of counters.** It must also be a number.
- **Which districts remain neutral** is countable on the island and must be a count in the header.

---

## 11. The consolidated asset list

**24 items.** No entry is a bitmap.

### Atmosphere (6)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Succession lighting preset: nine numbers, key raised close to overhead | Treatment |
| A2 | Sky and fog preset: bleached horizon, near plane pushed out | Treatment |
| A3 | Ships standing off, at anchor: 2 or 3 hulls | Geometry |
| A4 | Cleared-quay dressing: bales, sacks and jars removed | Treatment, from existing props |
| A5 | Stopped-work dressing: crane mid-lift with a block in its sling, lime pit skinned, chisels laid down, blank ruled slab | Geometry, from existing props |
| A6 | Slow block rotation in the sling, with a posed reduced-motion still | Animation rig |

### The board (8)

| # | Item | Kind |
| --- | --- | --- |
| B1 | Boundary stone, plain: a neutral district's run | Geometry |
| B2 | Boundary stone, cut chevron, and cut ring: the two claimants | Geometry x2 |
| B3 | Boundary stone, both marks: contested | Geometry |
| B4 | Plinth, bare | Geometry |
| B5 | Standing figure, and seated figure: the two claimants | Geometry x2 |
| B6 | Figure in a sling under shear-legs: contested | Geometry |
| B7 | **Drift warning: a numbered block at the plinth's foot with a cut faction mark**, plus its lift interpolation | Geometry + animation rig |
| B8 | Provisional outline variants of B5 and the claim plate | Geometry |

### Buildings (4)

| # | Item | Kind |
| --- | --- | --- |
| C1 | Claim plate: a carved inscription panel on a bracket, in both marks | Geometry x2 |
| C2 | Shutter plate, era four: squared boards set between the columns of a bay | Geometry |
| C3 | Corner tag, era four: a milestone-shaped marker with the contest mark | Geometry |
| C4 | Counter socket in a plinth base, for spent counters | Geometry |

### The UI (6)

| # | Item | Kind |
| --- | --- | --- |
| U1 | The counting board: ruled slab and counters, at 920 and its 460 strip | DOM + SVG |
| U2 | Action card design with its separate cost zone, and its five states | DOM |
| U3 | Action glyphs: secure, cancel, sway | SVG x3 |
| U4 | Plinth glyphs for the header row, filled and bare | SVG |
| U5 | Read-out panel: outcome first, plan list, leftovers, still-drifting line | DOM |
| U6 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 15 geometry items or sets, 2 animation rigs, 3 SVG sets, 5 DOM designs, 2
treatments. **Build B7 first.** The drift warning is what makes the crisis's central mechanism fair,
and every other item is decoration without it.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

1. **A faction colour on a claimed building.** The most obvious way to draw allegiance and it does
   not exist: `faceTones()` is dead code as far as the renderer is concerned, and a building's
   colour is baked into its GLB. **Every allegiance mark in this brief is geometry because of
   this**, and the workaround is better than the thing it replaces, because geometry survives
   zoom-out.
2. **Banners and hangings with a device on them.** No image textures. A banner would have to be
   geometry with a shaped cut-out, which is possible and expensive, and the boundary-stone marks do
   the job for a fraction of it.
3. **Braziers burning in a contested district.** Four global lights, no local light, no spill from
   emissive. A brazier is a bright face that lights nothing.
4. **Polished marble.** No environment map, `metalness: 0` by convention. Era four's marble is pale
   and faceted.
5. **Crowds in the forum.** No mobile agents anywhere in the crisis machinery, and the citizens
   system is a derived readout rather than a set of posed figures. A political crisis with nobody in
   it is a real limitation and the brief works around it by drawing **stopped work** instead.
6. **A tint on a district's ground to show who holds it.** Possible as a decal, deliberately
   rejected in section 2.2 because it would cover era four's paving, which is the era's whole ground
   identity, and because era four's authored radius (43 under #298) is well past the drawn grass
   (30), so a per-cell layer would extend past the island.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **What advances a cycle?** Carried in the crisis spec as **O-14**. If any action advances it, opening a menu costs a district; if only an answered batch does, hesitation between batches is free. | Team lead | The drift line says *"decides next cycle"*, and that sentence is meaningless until a cycle is defined. It is the most valuable line on the screen |
| **Q2** | **Does unspent influence survive the crisis?** Carried as **O-6**. The spec's recommendation is that it should not, or it becomes a store of value and brushes INV-CRISIS-2. | Team lead | It decides whether the read-out panel's leftover warning exists, and whether the slab is swept at the resolution panel |
| **Q3** | **Does a district that resolved against the player keep its capacity suspended?** The crisis spec lists era four's capacity restore as unspecified: whether a contested district is bought back or released on resolution is not ruled. | Team lead | It decides whether the shutter plates come off at the end for every district or only for some, which is a visible difference on the island |
| **Q4** | **How many districts, and are they authored or derived?** Section 3 assumes a small fixed set with one plinth each. | Whoever authors era four's land | Every district needs a plinth, a boundary run and a header glyph |
| **Q5** | **Are there exactly two claimants?** Section 3.2's standing and seated pair separates two by silhouette. **Three would need a third pose and the set stops reading at a glance.** | Team lead | It is the whole allegiance carrier |
| **Q6** | **Does the player have a claimant, or are they the city?** The copy in section 9 is written as though the player backs one side, and *"most of the city went your way"* assumes it. | Team lead | It changes the register of every outcome line |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-4 (influence tokens),
  D-CRISIS-16 (neutral drift, and the clockless-cycle rule), D-CRISIS-11 (era four's terminal
  condition), D-CRISIS-26's scope note (why era four has no action budget), the section 7 floor
  check confining factions to civic buildings, and INV-CRISIS-1, 3, 4, 5, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, shutter plate, copy
  rules and per-era decal reach
- `docs/superpowers/specs/eras/era-04-classical/style-guide.md`: the repeated bay, the paved floor,
  and the props kit, including the empty plinth and the ruled marble slab
- `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md`: the four claimable types
- `apps/web/src/city/palette.ts`: `faceTones()`, which computes the three-tone model that no
  renderer calls
- `engines/game/src/crisis-damage.ts`: `suspended_civic`
- `packages/economy/src/capacity.ts`: `deriveCapacities`, with no penalty term
- #298: era four's buildable radius of 43
- #302: era one's brief
