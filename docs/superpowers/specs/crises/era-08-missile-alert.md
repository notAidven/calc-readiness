# The Missile Alert: design and asset brief

**Era:** 8, Atomic
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era eight's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

**Two things about this crisis are rulings rather than preferences and both shape the art
directly:** it is **clockless**, and **nothing it hits is destroyed**. Sections 3.1 and 8 are written
to those and neither is negotiable.

---

## 0. The hard boundary

**Read `./README.md` first.** The four that bite on era eight:

1. **No local light, no bloom, no post-processing.** A klaxon flash, a searchlight, a sweeping beam,
   the flash of an impact: **every one of them is unbuildable.** Era eight's fiction reaches for
   light more often than any era but ten, and it can have none of it.
2. **Nothing tints a building at runtime.** A struck building cannot be drawn by scorching its
   colour. It becomes a **ruin stage**, which is added geometry, per section 8.
3. **No image textures.** Era eight's ground is *"painted lines and hatching"*, which is authored as
   flat geometry, and the crisis's ground markings are the same.
4. **No environment map.** Era eight's plate glass and aluminium trim are two of its four materials
   and they can be pale and faceted, never reflective.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading; emissive
as a bright face up to about 1.35; `useFrame` animation gated on `prefers-reduced-motion`; the shared
ground-decal ladder; and the nine lighting numbers plus sky and fog.

---

## 1. The crisis, and what the player does

**The premise, in one line.** Several things are inbound, they land on different turns, and there
are not enough interceptors for all of them.

**The ritual: I assign responses before simultaneous resolution.** Era eight is the only crisis of
the ten where the player **plans several actions and then watches them all resolve at once**. Every
other crisis commits one action per beat.

**The cadence: plan several responses, resolve them together.** Section 5 is built around it, and it
is the reason era eight's surface has an assignment tray that no other crisis has.

**Duration: survive until it ends.** Era eight shares this shape with era one alone: **a genuine
fixed length.** The counters reach zero and the alert is over.

**The axis is triage against a schedule.** You cannot stop everything, the arrivals are staggered,
and the question is which target is worth an interceptor.

**Entry.** After `ceil(n / 2)` of era eight's nodes. **Era eight is one of only two eras that does
not fire at three:** it has **nine** nodes (`FUN.4`, `FUN.5`, `FUN.6`, `FUN.9`, `FUN.10`, `LF.1`,
`LF.2`, `LF.3`, `LF.4`), so it fires at **five**.

### 1.1 The two rulings that shape the art

**Clockless, with no exception for the crisis whose fiction most strongly suggests a countdown.**
*"Arrival times" means turns or completed answers, never real-time seconds.* The reasons are
specific to this crisis: a mechanic that advances on a wall clock is farmable by idling and cannot be
tested without a fake clock, and a missile timer is precisely the shape
`docs/Game_Visual_Design_Brief.md` bans, a countdown framed as pass or fail, for an audience this
product is built around.

**The staggered arrivals are fully expressible in turns and that is the more legible reading
anyway:** *"this one lands in two rounds"* is a fact a player can plan against, where *"this one
lands in eleven seconds"* is a fact they can only react to.

**Nothing is destroyed.** An unintercepted target **must ruin, not delete**. The crisis spec singles
era eight out: *"of the ten this is the crisis whose fiction most strongly implies destruction, so
the floor should be restated inside its own design."* **It is restated in section 8, and it is the
reason there is no explosion in this brief.**

### 1.2 Era eight against eras three and ten

All three have things moving at the settlement, and the crisis spec separates them by verb.

| | Era three | Era eight | Era ten |
| --- | --- | --- | --- |
| The verb | **Intercept** a route | **Triage** against a schedule | **Deny** the thing they walk toward |
| What the player touches | The route | **The target** | The power state |
| The characteristic failure | Blocking the wrong road | **Saving the wrong building** | Leaving something lit |

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the town is under alert.

**Era eight's inversion is the sharpest of the nine.** This is *"a confident, cleaned-up town built
by people who are certain the next fifty years will be better than the last fifty"*, and it is the
only advance in the ten-era run where the ground gets **lighter**. **The crisis is that confidence
interrupted**, and the way to draw it is not to make the town dark. It is to leave the town exactly
as bright and clean as it is, and empty it.

**The constraint:** era eight's floor in the ground ladder is **poured concrete and asphalt**: large
in-situ bays with wide, few, straight expansion joints and a broom finish, asphalt where vehicles
run, painted lines and hatching organising it, precisely levelled landscape held by low concrete
kerbs. **None of that changes.**

### 2.1 The light

**The direction: hard, white and slightly too bright.** Era eight's optimism is written in its light
and the crisis should make that optimism feel exposed rather than replace it.

| Lever | Era eight's day preset today | Alert direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Pure white.** Take the warmth out and the confidence goes with it |
| Key intensity | 1.32 | **Up.** A town with nowhere to hide |
| Key angle | Low and raking | **High.** Short hard shadows under the thin flat planes, which is what those planes were designed for |
| Hemisphere sky | `#CFE6F6` | Paler, near white |
| Hemisphere ground | `#C08F57` warm earth | **Pale concrete.** Era eight's ground genuinely is pale poured concrete and the bounce should be it. **This is also the era where the existing warm-earth default is most wrong**, crisis or not |
| Hemisphere intensity | 0.95 | Slightly up |
| Ambient | `#F5EFE2` at 0.30 | Cool and flat |
| Rim | `#BFDCEF` at 0.48 | Keep. The thin flat plane is a silhouette element and the rim is what separates it from the sky |
| Background (sky) | `#BFE1F2` clear blue | **A hard white sky with the barest blue at the zenith.** Bleached, not dark |
| Fog colour | `#D6ECF7` | Very pale, close to the sky |
| Fog near and far | `radius x 3` to `radius x 20` | **Push the near plane out and keep the far plane where it is.** Era eight wants the horizon visible and hard |

**The trap: do not go to night, and do not go to red.** A night raid is the obvious image and it is
wrong twice: it is not the era's light, and **red is the wrong-answer colour on the same screen.**

### 2.2 Ground

**Era eight's ground is the only one of the ten that already has a marking system**, and the crisis
uses it: *"painted lines and hatching organising it"*.

- **A target zone is a hatched rectangle** in era eight's own painted-marking vocabulary, laid on the
  shared decal ladder as thin flat geometry, over the cells the inbound will land on. **Not a
  crosshair, not a circle, and not red.** Era eight paints hatching on the ground to mean "keep off
  this", and the crisis means exactly that.
- **The hatch's pitch says how soon.** Three pitches, coarse to fine, for three, two and one turns
  out. **It is a second channel behind the marker post's numeral** (section 3.2) and it means a
  player reading the ground rather than the posts still gets the schedule.
- **The scar stripe stays.** Era eight's ground carries the mark where the industrial rails were
  lifted, and it is era history rather than crisis damage. Nothing in this crisis may look like it.

**The reach question, and era eight is where it is worst.** Under
#298 era eight's buildable radius is
**61**, which is **past the drawn grass at 30 and past the lagoon at 58.** Era eight is the first
era whose buildable disc leaves the sea entirely. Its 732 cells cover several times the drawn
island's area. **The hatching must clip to the drawn island**, and a target zone that resolved to
cells outside it would be painted on nothing at all.

### 2.3 Vegetation

**Era eight is the first era in five where somebody plants something for pleasure**, and the crisis
leaves the planting alone: young standard trees in metal guards, clipped shrub blocks held by a kerb.

**One change:** **the trees in their guards are the only thing in the town still being looked after
and nobody is looking after them.** No visible change is needed, and that is the point: the planting
stays immaculate while the town empties, which is more unsettling than letting it go.

### 2.4 Water and shoreline

**Era eight rebuilt its shoreline in concrete and the crisis does not touch it.**

The one change is at the town's own water: **the paddling pool is drained**. Era eight's kit has *"a
shallow paddling pool with a tiled rim"*, and an empty pool with its tiled rim dry is one of the
strongest and cheapest images available to this crisis, because it is the era's optimism with the
water let out of it.

### 2.5 Signs of habitation at the margins

**A town that went indoors and left everything tidy**, from era eight's own kit:

- **Bicycles still in the racks**, a full rank, none taken. Nobody rode home.
- **The timber-slat benches empty**, the drinking fountain running with nobody at it.
- **Blinds down behind the plate glass**, generally, across the town. Era eight's glass is one of its
  four materials and a blind is the era's own answer.
- **Sandbags at the doorways.** Period-exact, and it is added geometry at the base of a building
  rather than a change to the building. **This is the one dressing that says alert rather than
  holiday.**
- **The weather station.** Era eight's kit has *"a louvred white instrument box on legs with an
  anemometer above it"*, and **the anemometer still turns**. It is the one thing in the scene doing
  its job.
- **The dial boards read.** The era's tally descendant is *"a painted steel panel of round gauges"*
  and every one in town is still showing a number nobody is reading.

### 2.6 Does anything move

**Very little, and the little that does is instruments.**

- **The anemometer turns.** The only mechanical motion in the town.
- **Contrails cross the sky**, slowly, high. **This is the crisis's one atmospheric element and it is
  entirely free of the light problem**: a contrail is a thin white geometry strip against a white
  sky, which is exactly what this renderer draws well.
- **The inbounds themselves do not fly across the sky.** See section 3.3: they are on the peg board
  and on the ground, not in the air. A flying missile would imply a duration this crisis does not
  have.
- **Every animation is gated on `prefers-reduced-motion`.**
- **Nothing that moves may advance the encounter.** Era eight needs this stated more loudly than any
  other crisis, because its fiction is a countdown and its mechanic is not.

### 2.7 The transition, in and out

**In:** the lighting numbers, the bleached sky, the contrails, the first target hatching appearing,
the blinds coming down, the sandbags going up, the pool draining.

**What never changes:** the buildings, the concrete bays and their joints, the painted lines, the
kerbs, the island's geometry, the shoreline.

**Out:** the hatching lifts, the blinds go up, the pool refills. **Ruins stay**, and section 8 covers
what they look like.

### 2.8 The read, in one sentence

*The same bright confident town under a hard white sky, contrails across it, blinds down and
sandbags at the doors, the paddling pool drained, and hatching painted on the ground where things
are going to land.*

---

## 3. The hazard

### 3.1 The schedule, and the trap this crisis exists to avoid

**Era eight's schedule must never read as a clock.** Three displays are ruled out and one is
specified.

| Rejected | Why |
| --- | --- |
| **A countdown bar** | It is a duration made into a length. It reads as seconds even when it is turns, and it is the exact shape `Game_Visual_Design_Brief.md` bans: a countdown framed as pass or fail |
| **A sweeping dial** | Era eight's own tally descendant is the dial, so this will suggest itself. **A needle that sweeps is a clock.** A dial is only admissible with hard integer detents and a needle that snaps between them, and even then it is worse than the alternative below |
| **A ticking numeral** | A number that changes on its own is a clock whatever drives it |

> **The peg board.** A grid of holes: **one column per turn, one row per inbound**, with a peg in the
> cell where that inbound lands. Pegs move **one column left when the player advances the turn** and
> never otherwise.
>
> It is countable, it is integer, it has no continuous state, it cannot be mistaken for seconds, and
> it is exactly the operations-room instrument era eight would have. **It is also the most accessible
> schedule display available**, because a position in a grid is a fact a screen reader can state.

### 3.2 The target, on the island

Each inbound has a target, and the target is a place on the ground.

| Element | Geometry | Channels |
| --- | --- | --- |
| **The zone** | **Hatched rectangle** over the cells it lands on, in era eight's painted-marking vocabulary | Hatch relief, and **hatch pitch says how soon** |
| **The count** | **A marker post at the zone's edge** with a **raised numeral plate**: 3, 2 or 1 | The numeral is geometry and it is the primary read |
| **The stake** | The buildings inside the zone, **outlined** | Outline, plus the rail names them |

**The numeral plate uses era eight's confident sans lettering**, which the era's kit already carries
as *"an aluminium letter set standing off a concrete plane"*. It is the era's own signage doing the
crisis's work.

### 3.3 What the inbound itself looks like, which is nothing

**There is no missile in this brief.** Deliberately, and for three reasons:

1. **A thing flying across the sky implies elapsed time**, and this crisis is clockless.
2. **A thing arriving needs an impact, and an impact needs light**, which cannot be drawn.
3. **The player's decision is about the ground**, not about the sky. Every unit of attention spent on
   an object overhead is attention not spent on the triage.

**The crisis is a schedule and a set of places.** The peg board says when, the hatching says where,
and nothing else is needed.

**A contrail high in the sky is the only nod to what is coming**, and it is scenery rather than an
object with state.

### 3.4 The resolution, which is simultaneous

**All assigned responses resolve together, in one pass**, and the board's job is to make that pass
legible rather than confusing:

1. **The interceptors fire**, in target order. Each is a short interpolation on the player's own
   advance, not a timed flight.
2. **The intercepted zones clear**: hatching lifts, marker post drops.
3. **The unintercepted zones resolve**: the hatching goes to a **struck** state and the buildings
   inside it go to their ruin stage (section 8).
4. **The board settles.**

**Under `prefers-reduced-motion` the whole pass is one posed frame**: zones cleared or struck,
buildings ruined, nothing in flight.

**There is no explosion.** See section 8, and section 12 item 1.

---

## 4. The player's own mark

**The interceptor battery.** A concrete pad with a launcher on it, in era eight's own materials: a
poured pad with a broom finish, a low parapet, a thin flat canopy, and a rail-mounted body under it.

### 4.1 Why a battery rather than a shot

**The battery stands on the island for the whole crisis** and it is the player's presence in the
scene. A shot is a moment; a battery is a fact. **Era eight's board would otherwise have nothing on
it that belongs to the player**, which is the failure era one's fire exists to avoid.

### 4.2 The three rungs

Accuracy sizes the action, never whether it happens. Era eight's cadence plans several responses at
once, so **what a batch sizes is how many interceptors are available to assign this turn**:

| Rung | What is available |
| --- | --- |
| **1 right** | One interceptor |
| **2 right** | Two |
| **3 right** | Three |

**The bottom rung still fires.** One interceptor against three inbounds is a triage decision, which
is the axis, so the bottom rung of this crisis is the most playable bottom rung of the nine.

**Whether this is what accuracy sizes is [Q1](#13-open-questions)**, since the ruling fixes the
cadence and not the scaling.

### 4.3 The assignment mark

**An assigned interceptor is drawn at the target, not at the battery.** A **thin flat plate on a
short post** standing at the zone's edge, in the era's aluminium accent, carrying the battery's
number. **It is the plan made visible on the ground**, which is what a crisis that plans several
responses needs.

**An assignment can be taken back** until the turn resolves. That is the whole point of a planning
phase, and the board must make undoing feel as cheap as doing: the plate lifts, nothing else changes.

---

## 5. The crisis surface

**Era eight's surface is a planning tray**, which no other crisis in the folder has.

### 5.1 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.**

Rail order:

1. **Header**: the crisis name, and **turns remaining** as a count. **Not a bar.**
2. **The peg board**, which is the crisis's central instrument and sits above everything else.
3. **The assignment tray**: one row per available interceptor, each either unassigned or naming its
   target, with a control to take it back.
4. **The target cards**, one per inbound.
5. **The read-out panel**, when a target is armed.
6. **The resolve control**, which is the thing that ends the planning phase.

**The resolve control is distinct from a commit control** and it should look it: committing assigns
one interceptor, resolving runs the whole turn.

### 5.2 At 460

Single column, **board first**, cropped to the target zones. **If the zones do not fit, the crop
follows the nearest arrivals**, because those are the ones being decided.

**The peg board stays**, at a reduced cell size, and it does not collapse: it is the schedule and the
schedule is the crisis. At 428 units a board of four columns by four rows is comfortable, which is
also a useful upper bound on how many inbounds the crisis should carry at once.

**The assignment tray collapses to a single line** with a count and an expand control.

### 5.3 The hierarchy

**The peg board and the hatching are one instrument in two places.** A player should be able to look
at the ground and see where, look at the board and see when, and never need to reconcile them,
because the marker post carries the same numeral the peg board's column does.

---

## 6. The option cards

### 6.1 The actions

| Action | Kind of answer | Glyph |
| --- | --- | --- |
| **Assign an interceptor** | **The triage answer.** The crisis's whole axis | A plate on a post over a hatched rectangle |
| **Move people out** | The mitigation answer: the building still takes the hit and the loss is smaller | Figures leaving a plan outline |
| **Shore up a building** | The hardening answer: the building takes the hit and stays standing | A plan outline with a thickened edge |

**The second and third are not ruled** and are [Q2](#13-open-questions). One verb across a triage
crisis makes every turn the same shape of decision.

### 6.2 The card

428 units wide, about 104 tall.

- **A 40 unit glyph** on the left, from the table above.
- **The target name**, **when it lands** at 14 units, and **what is in the zone** at 13. **What is in
  the zone is the most important line on the card**, because triage is a decision about which
  building matters more.
- **A cost zone** carrying the interceptors it takes.

### 6.3 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2, card lifts 1, **no colour change**, and **the target zone raises on the board with the buildings inside it outlined** |
| **Armed** | 3-unit border, corner flag with a check glyph, **Chosen**, `aria-pressed="true"` |
| **Assigned** | **Distinct from armed**, and this is era eight's own state: the card shows which interceptor is on it and a **Take it back** control |
| **Unavailable** | **The reason replaces the ladder**: *"No interceptors left this turn."* `disabled`, `aria-describedby` |

**Era eight has six card states rather than five**, because assignment is reversible and the other
crises' commitments are not. **That difference is the cadence** and the card set has to carry it.

---

## 7. The read-out panel

### 7.1 What it is for

The player is deciding which target to spend an interceptor on. **The question is "what is in this
one, compared to what is in the others?"**

### 7.2 The direction

- **Lead with what is in the zone, by name.** Not cells, not percentages. **Buildings are the
  stake**, and this is the crisis where that is most literally true.
- **Compare, do not describe.** Era eight is a triage crisis, so the panel should show the armed
  target **beside** the others landing on the same turn. A panel that describes one target in
  isolation is answering the wrong question.
- **Say what an unintercepted hit does**, plainly and without drama: the buildings in the zone become
  ruins and can be rebuilt. **This is the floor restated where the player will read it**, which the
  crisis spec asks for.
- **Show the schedule.** A small plan of the zone with its peg-board row beside it.
- **No dashed borders.**

### 7.3 The provisional register

**A proposed assignment is an outline of the plate on the post**, not a plate. **A committed
assignment is a solid plate**, and it is still reversible, which is the one place in this folder
where a solid mark can be taken back. Section 6.3's **Assigned** state is what makes that legible in
the rail.

---

## 8. Damage and consequence

**The floor is restated here because the crisis spec asks for it and because this is the crisis
whose fiction most strongly implies destruction.**

> **An unintercepted target ruins. It does not delete.** The building stays at its cell, carrying its
> lesson, as a **ruin stage**. It is still a click target. `engines/game/src/crisis-damage.ts` holds
> exactly `ruined_buildings`, `ruined_cells` and `suspended_civic`, and **has no field that could
> record a removal.**

### 8.1 What a struck zone looks like

| Element | What is drawn | Channels |
| --- | --- | --- |
| **The buildings** | **Ruin stage:** silhouette collapsed, era eight's slabs tilted out of true, its thin flat planes bent | Silhouette collapse |
| **The ground** | **Struck ground:** the shipped scarred-ground slab on the `worn` rung, in the dead char tone `0x4A4844`, with era eight's concrete bays **cracked at their expansion joints** | Slab relief, crack geometry |
| **The zone marking** | The hatching goes from its "inbound" pitch to a **struck** state: the hatch broken and displaced | Relief change |

**Era eight's ruin should read as a modern building failing rather than as rubble.** A concrete
frame tilts and its planes bend; it does not become a heap. That is a distinct ruin template from era
five's charred posts, and it is worth authoring separately.

### 8.2 There is no explosion

**Deliberately, and it is worth saying so in the brief so nobody adds one.** An explosion is a flash,
and a flash is light, and there is no light. An explosion built without light is a grey puff, which
is worse than nothing. **The crisis resolves by the board changing state, and the change of state is
the drama.**

**A short dust rise from a struck zone is permitted**, as small meshes, posed under reduced motion.
It is dust, not fire.

### 8.3 Repair

Ruins are rebuilt at the authored price and struck ground is reclaimed per cell, through the shipped
repair path. **`materialForEra` returns `null` for every era but `prehistoric`**, so era eight has no
denominator yet.

### 8.4 What persists

| Thing | After |
| --- | --- |
| Ruined buildings | Stay until rebuilt |
| Struck ground | Stays until reclaimed |
| The batteries | **A question**: whether an interceptor battery is a crisis object or a permanent one is [Q3](#13-open-questions) |
| Target hatching | Goes |
| Sandbags and blinds | Go |

---

## 9. The copy

**Register: results, not purchase.** Era eight's exposure is through the interceptor count: *"three
correct answers buys three interceptors"* is the sentence to avoid.

- **Right:** *"3 right. Three interceptors ready."*
- **Wrong:** *"3 right. You can afford three interceptors."*

**Plainer language matters here more than anywhere**, and for a specific reason: **this is the crisis
most likely to be written with drama.** The fiction invites urgency, alarm and stakes-narration, and
every one of those is the register the lead has rejected. **Say what is inbound, when it lands, and
what is in the zone. Nothing else.**

**Do not narrate the loss.** *"The Civic Centre is a ruin. It can be rebuilt for 60 material."* is
the whole line.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Alert** |
| Entry announcement, heading | **Three inbound** |
| Entry announcement, body | They land on different turns and there is not an interceptor for each of them. You can go to the post when you are ready. |
| Entry announcement, control | **Go to the post** |
| Header | **{n} turns to go** |
| Board label | The island. Zones, and what lands in them. |
| Peg board heading | **What lands when** |
| Peg board row | Inbound 2. Lands in two turns, on the Civic Centre. |
| Declare heading | **Choose what to cover** |
| Declare body | Pick a zone, then answer {n} questions. How many you get right sets how many interceptors you have this turn. |
| Commit control | **Assign it** |
| Take back control | **Take it back** |
| Resolve control | **Let the turn run** |

### 9.2 The cards

| Line | String |
| --- | --- |
| Assign, name | **Cover the Civic Centre zone** |
| Assign, when | Lands in two turns |
| Assign, what is in it | The Civic Centre and the Public Library |
| Assign, cost | Takes 1 interceptor |
| Move people out, name | **Move people out of the Civic Centre** |
| Move people out, body | It still takes the hit. Less is lost. |
| Shore up, name | **Shore up the Civic Centre** |
| Shore up, body | It takes the hit and stays standing. |
| Ladder rung 1 | 1 right: one interceptor this turn |
| Ladder rung 2 | 2 right: two interceptors |
| Ladder rung 3 | 3 right: three interceptors |
| Unavailable | No interceptors left this turn. |
| Armed | **Chosen** |
| Assigned | Interceptor 1 is on this. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **The Civic Centre zone** |
| What is in it | The Civic Centre and the Public Library. |
| When | It lands in two turns. |
| The others | The harbour zone lands on the same turn. It has the Cold Store in it. |
| If it is not covered | Both buildings become ruins. They can be rebuilt afterwards. |
| The bet | You can see what is in each zone. You cannot see the score yet, and that is the choice. |

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
| Last question | **See what is ready** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Three right | 3 right. Three interceptors ready. |
| Two right | 2 right. Two interceptors ready. |
| One right | 1 right. One interceptor ready. |
| None | 0 right. Nothing is ready this turn. |
| Intercepted | The Civic Centre zone is clear. |
| Struck | The harbour zone took it. The Cold Store is a ruin and it can be rebuilt for {n} material. |
| Turn passed | Two inbound left. |
| Ended clean | **The alert is over.** Nothing got through. |
| Ended with damage | **The alert is over.** Two buildings are ruins and the ground under them needs clearing. |

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.** **The peg board is the most
accessible instrument in this folder** and that is one of the reasons it was chosen: a position in a
grid states itself.

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Target zone | one hatch tone | **Hatch relief**, **hatch pitch** for how soon, **marker post with a raised numeral**, plus the peg board and the card |
| Zone, one turn out | same tone | **Finest hatch pitch**, numeral 1, peg in the first column |
| Zone, struck | one tone | **Broken and displaced hatch**, scarred-ground slab, cracked expansion joints, ruined buildings |
| Zone, cleared | none | **Hatching absent**, post gone |
| Interceptor available | none | **A row in the assignment tray**, and a count in the header |
| Interceptor assigned | none | **A plate on a post at the zone**, plus the tray row naming its target |
| Proposed assignment | outline | **Outline of the plate, not a plate** |
| Building ruined | none | **Silhouette collapse** (tilted slabs, bent planes), status line |
| Card armed / assigned / unavailable | border | Corner flag; the assigned line and its take-back control; reason text |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Peg board cell | `Inbound 2 lands in two turns, on the Civic Centre zone.` |
| Target zone | `The Civic Centre zone. Lands in two turns. The Civic Centre and the Public Library are in it. Not covered.` |
| Target zone, covered | the same, plus `Covered by interceptor 1.` |
| Assignment tray row | `Interceptor 1. Assigned to the Civic Centre zone. Take it back.` |
| Assignment tray, free | `Interceptor 2. Not assigned.` |
| Assign card | `Cover the Civic Centre zone. Lands in two turns. The Civic Centre and the Public Library are in it. Takes one interceptor. You have two.` |
| Battery | `Interceptor battery. Two of three ready.` |
| Ruined building | `The Cold Store. A ruin. It can be rebuilt for 60 material.` |
| Resolve control | `Let the turn run. Two zones are covered and one is not.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **The comparison is the crisis.** Triage means weighing zones against each other, and a list read
  one at a time does not afford that. **The read-out panel must name the other zones landing on the
  same turn**, which is what section 7.2 requires, and it is an accessibility requirement as much as
  a design one.
- **The resolve control must state what is uncovered before it runs.** A player should never resolve
  a turn without having been told, in words, that a zone is unprotected.
- **The simultaneous resolution changes many things at once.** It gets an assertive live region
  summarising the whole pass in one sentence per zone.

---

## 11. The consolidated asset list

**23 items.** No entry is a bitmap.

### Atmosphere (7)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Alert lighting preset: nine numbers, key white and up, hemisphere ground to pale concrete | Treatment |
| A2 | Sky and fog preset: hard white, near plane pushed out | Treatment |
| A3 | Contrails: thin strips across the sky, with a posed reduced-motion still | Geometry + animation rig |
| A4 | Sandbags at doorways, 2 or 3 arrangements | Geometry |
| A5 | Blinds down behind the plate glass, as general dressing | Geometry |
| A6 | Drained paddling pool treatment | Treatment |
| A7 | Island clip for the ground markings, so cells past radius 30 are not drawn | Treatment |

### The board (7)

| # | Item | Kind |
| --- | --- | --- |
| B1 | **Target-zone hatching, in three pitches for three, two and one turns out** | Geometry x3 |
| B2 | Struck hatching: broken and displaced | Geometry |
| B3 | **Marker post with a raised numeral plate**, in era eight's sans letter set | Geometry, 3 numerals |
| B4 | Stake outline around the buildings inside a zone | Geometry |
| B5 | Assignment plate on a post, in the aluminium accent, numbered | Geometry |
| B6 | Proposed-assignment outline | Geometry |
| B7 | Interceptor firing interpolation, and its posed still | Animation rig |

### Damage (3)

| # | Item | Kind |
| --- | --- | --- |
| D1 | **Era eight ruin template: slabs tilted out of true, thin flat planes bent.** Distinct from era five's | Geometry, per footprint |
| D2 | Struck ground: the shipped scar slab plus cracked expansion joints | Geometry |
| D3 | Dust rise from a struck zone, and its posed still | Geometry + animation rig |

### The battery (2)

| # | Item | Kind |
| --- | --- | --- |
| R1 | Interceptor battery: poured pad, low parapet, thin flat canopy, rail-mounted body | Geometry |
| R2 | Battery ready and spent states | Geometry |

### The UI (4)

| # | Item | Kind |
| --- | --- | --- |
| U1 | **The peg board**, at 920 and at its reduced 460 size | DOM + SVG |
| U2 | **The assignment tray**, with its take-back control, full and collapsed | DOM |
| U3 | Target card with its six states, including **Assigned** | DOM |
| U4 | Read-out panel: what is in it, when, and the comparison against the others | DOM + SVG |

**Counts by kind:** 14 geometry items or sets, 3 animation rigs, 2 SVG sets, 4 DOM designs, 4
treatments. **Build U1 and B1 first.** The peg board is the crisis's whole schedule and it is the one
piece that has to be right, because getting it wrong is how this crisis becomes a countdown.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

1. **A klaxon that flashes, and a searchlight.** The single most obvious image in this crisis's whole
   vocabulary and **none of it can be drawn**. There is no `pointLight`, no `spotLight`, no beam, no
   volumetric scattering for a beam to be visible in, and no bloom. **A klaxon can be a horn on a
   post with a bright emissive face and it will not flash and will not light anything.**
2. **The flash of an impact.** Same constraint, and it is why section 8.2 rules out an explosion
   outright rather than attempting one.
3. **Night, and the town lit from within.** Era eight's plate glass and its lit interiors would be a
   strong image and every window would be an emissive face lighting nothing. **The brief goes hard
   white daylight instead**, which is also truer to the era.
4. **Reflections in the plate glass.** No environment map. Era eight's glass is pale and faceted.
5. **A per-cell ground layer at era eight's authored radius.** **This is the worst case of the
   nine:** radius 61 is past the drawn grass at 30 **and past the lagoon at 58**, so hatching drawn
   at the authored radius would be painted over open sea and past it. A7 exists for this reason and
   era eight is the era where it matters most.
6. **A missile visible in flight.** Buildable and deliberately rejected: it implies elapsed time in a
   clockless crisis, and it would need an impact, which needs light.
7. **Smoke columns from struck zones.** Buildable, and worth considering: era five's smoke rig would
   transfer. **Deliberately left out here** because a struck zone is a resolved fact rather than an
   ongoing hazard, and a smoke column would suggest the fire is still spreading, which is era five's
   mechanic and not era eight's.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **What does accuracy size?** Section 4.2 draws it as interceptors available this turn, which gives the bottom rung a real triage decision. The alternative is that it sizes an interceptor's reliability, which would make a covered zone uncertain and change the whole read-out panel. | Team lead | It decides the ladder and whether "covered" is a definite state on the board |
| **Q2** | **Are there actions other than intercepting?** Section 6.1 draws three because a triage crisis with one verb is one decision repeated. Only the interceptor is ruled. | Team lead | Two cards, two glyphs, two sets of copy, and a different read-out panel |
| **Q3** | **Is the interceptor battery a permanent building or a crisis object?** If permanent it is a civic building with a cost and a place in the catalogue; if crisis-only it appears at entry and goes at exit. | Team lead | It decides whether R1 is a crisis asset or a city asset, and whether the player places it |
| **Q4** | **How many inbounds at once, and over how many turns?** Section 5.2 notes that four by four is the comfortable upper bound for the peg board at 460. | Team lead, with whoever tunes it | Above that the schedule display stops being readable at the narrow width, which is a hard layout limit rather than a preference |
| **Q5** | **Does a zone cover several buildings or one?** Section 3.2 draws a zone over cells, which may hold more than one building, and that is what makes triage a weighing. | Team lead | It decides whether the stake line names one building or a list, and whether zones can overlap |
| **Q6** | **Does an unintercepted hit ruin every building in the zone, or damage them?** Section 8 assumes ruin. PR #297 introduces damage before ruin for era one, and if that generalises, era eight has an intermediate state and needs its geometry. | Whoever owns `crisis-damage.ts` | It is a whole additional building state and template |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-3 (clockless, with the
  reasoning specific to this crisis), D-CRISIS-9 and D-CRISIS-24 (the `ceil(n / 2)` trigger, and era
  eight as one of two eras that does not fire at three), D-CRISIS-11 (survive until it ends), the
  section 7 floor caveat restated inside era eight's design, and INV-CRISIS-1, 3, 4, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, copy rules and
  per-era decal reach
- `docs/Game_Visual_Design_Brief.md`: the ban on a countdown framed as pass or fail, which is why
  section 3.1 rejects three displays before specifying one
- `docs/superpowers/specs/eras/era-08-atomic/style-guide.md`: the thin flat plane, the poured ground
  with its painted lines and hatching, and the props kit including the dial board, the letter set,
  the paddling pool and the weather station
- `apps/web/src/city/three/ruinStage.ts`: the stage-swap seam era eight's ruin template joins
- `apps/web/src/city/three/ScarredGround.tsx`: the shipped scar slab
- `engines/game/src/crisis-damage.ts`: the type with no field for a removal
- #297: damage before ruin, which bears
  on Q6
- #298: era eight's buildable radius of
  61, past the grass and past the lagoon
- #302: era one's brief
