# The Hard Winter art brief: addendum, for the mechanics it never designed

**Date:** 2026-08-01
**Status:** addendum. A **new file** rather than an edit to
`2026-07-30-hard-winter-crisis-art-brief.md`, so that brief stays readable as the document it was
and this stays readable as what was found missing from it.
**Measured at:** `integration` `e53bf9cd`, with
#369 (open, `mergedAt: null`) merged into
the branch this was written on. Every code claim below was taken off that tree, not recalled.
**Scope:** the rows of the mechanic inventory era one's brief does not cover. **This does not
redesign anything that ships and works.**
**Plates:** `crisis-reference-packs/hard-winter/`, plates `07`, `08` and `09`.

---

> ## AMENDED 2026-08-01, later the same day: the protection ladder yields to the code on two rows
>
> **Both documents landed and they disagreed in three places.**
> #375 (this addendum) merged at
> `4072c5be`, `mergedAt: 2026-08-01T18:20:38Z`;
> #381 (the shield and threatened
> building, which §5 leans on) merged at `091a729a`, `mergedAt: 2026-08-01T19:15:24Z`. §5.1 was
> written as a RECORD of that branch rather than as a proposal, so where the two disagree the
> record is simply wrong about what shipped, and the disagreement was carried into
> `#381`'s own section 6 rather than resolved by whoever merged second.
>
> **The lead ruled, and the ruling splits: the brief yields on two rows and the code yields on
> one.**
>
> | row | the brief said | the tree says | who wins |
> | --- | --- | --- | --- |
> | the threat mark | a standing marker at the building's **front corner**, in **amber** | a **billboard above the roofline**, in the ice front's own `#3c7fa0` | **the code.** §5.1 is amended, and §5.1a records why the blue is not merely acceptable but correct |
> | a lost building | no rung at all: the ladder stopped at *spent* | every ruin wears a broken cross | **the code.** §5.1 gains the rung |
> | an unthreatened building | **nothing added** | a stone hexagon in place of its mastery stars | **the brief**, and `#381`'s own author conceded the row. The hexagon is removed, `CrisisStatus` is now two values, and an unthreatened standing building keeps the stars it had before the winter |
>
> **What that ruling changed in the tree, so the amendment is not the whole of it.** The hexagon
> came off in the pull request that carries this amendment, and the five states were
> re-photographed on the island without it to confirm the removal cost no separation. That
> matters because `#381`'s frames were all taken WITH the hexagon present, so *"the five states
> are mutually distinguishable"* was, until those frames, a claim about a board that no longer
> ships.
>
> **§1's M15 and M16 rows, §5's opening, §7's plate row and §8 item 5 are corrected in place**,
> because each of them describes a branch with no pull request and that is no longer true of the
> tree. Nothing else in this document is touched: the fire's three sections, the duration gap and
> the aftermath rows are as they were.

---

## 0. Why this exists, in the lead's words

> *"make sure that it includes every possible mechanic/feature we would want in the crisis; for
> example, the last brief for the Hard Winter didn't design what the fire would look like, or the
> shielded buildings."*

**Both examples check out against the brief, and the second is worse than the first.**

- **The fire has a section and it is not about the fire's states.** §4 of that brief is about making
  a fire read as hot in a renderer that cannot light anything, which is a real problem and is well
  answered. What it does not carry: the aimed-coverage footprint as a treatment, the pre-commit
  preview at all, and duration as anything more than a one-line recommendation in §4.4.
- **The shield has no section.** *"Reinforce"* appears in that brief three times: as one of three
  option cards in §5.2, as an asset row (`U3`) for a card icon, and as a copy recommendation in
  §7.3. **There is no geometry, no state list, and no mention of what a spent shield looks like.**
- **Neither does the threatened building**, which is the state that makes reinforcing a decision
  rather than a guess.

**The shape of the failure, because it generalises and it is the reason the three new briefs are
structured differently.** That brief is organised by the six atmosphere axes the era guides use, plus
one section per antagonist and one per surface. Everything the player OPERATES belongs to the loop
rather than to the world, and the loop has no axis list, so the interactive half is never reached
rather than argued away. **An omission that is never reached is invisible in review**: a reader
checking that brief against its own contents finds nothing missing.

`crisis-reference-packs/README.md` section 3 is the missing contents list. This document runs it over
era one.

---

## 1. Era one against the inventory, all 24 rows

Same 24 rows as the three new briefs, so the four can be read side by side. **The status column is
about the TREE, not about the brief**, because era one is built and what matters is whether a player
can see the thing.

| # | Mechanic | Status at `e53bf9cd` | Designed in a document? |
| --- | --- | --- | --- |
| M1 | The crisis call | **Built.** `crisisCall.ts`, chip plus briefing slides | Yes, §7.4 of the brief, as copy |
| M2 | The city frozen while a call is unanswered | **Not built.** `useCrisisCall` is session-local and transition-only, so a learner loading a city already past the trigger is called by nothing | **No, and it is not art.** The gap is a durable call, which is the crisis spec's O-13 chain and is engineering |
| M3 | Entry and exit | **Built.** `WINTER_LIGHT` swaps in, `thaw.ts` reverts weather and keeps damage | Yes, §2.7 |
| M4 | Atmosphere: light, sky, fog, exposure | **Built**, and it went further than the brief asked: exposure, shadow intensity and the key's ANGLE all move | Yes, §2.1, and see section 2 below for what shipped beyond it |
| M5 | Ground under the crisis | **Built.** Snow course on the decal ladder, drifts against verticals | Yes, §2.2 |
| M6 | Water and shoreline | **Built.** `WATER_COLD`, sea dissolving into fog | Yes, §2.4 |
| M7 | Vegetation | **Built.** Snow caps per archetype | Yes, §2.3 |
| M8 | The hazard's body and stages | **Built.** Frost, three stages, by relief | Yes, §3.2 and §3.3 |
| M9 | Propagation and its leading edge | **Built.** The frost line, one rung up, one tone colder | Yes, §3.3 |
| M10 | The counter-mechanic as an object | **Built.** Hearth, flame, smoke column | Yes, §4.2 |
| M11 | Its own states | **Built.** A hearth with no ember is a declaration that bought nothing | **Partly.** §4.3 tables three states in words and specifies none of them as geometry. **Section 3 below.** |
| M12 | Aimed coverage and its footprint | **Built.** `TERRAIN.warded`, feathered rim, `radius_by_tier` | **No.** §4.2 item 4 asks for a melt ring and does not specify the rim, which is the part that had to be decided. **Section 3.** |
| M13 | Pre-commit preview | **Built**, and it is the strongest thing in the layer: a ghost of the RESULT rather than a frame round the cell | **No. Not mentioned in the brief at all.** Its design lives in `winterFireGhost.ts`'s docblock. **Section 3.** |
| M14 | Duration | **NOT BUILT.** `burn_rounds_by_tier` runs 2 / 2 / 3; `WinterFire`'s view carries `rounds_left` and no mesh reads it | **A one-line recommendation** in §4.4. **Section 4 below, and plate 08.** |
| M15 | Protection, and how much is left | **NOT LANDED** at `e53bf9cd`, designed on `origin/game/winter-shield-and-threat`, which had **no pull request**. **LANDED 2026-08-01 as #381**, `091a729a` | **No.** **Section 5, and plate 09.** |
| M16 | The threatened-but-unprotected building | **NOT LANDED** at `e53bf9cd`, same branch. **LANDED 2026-08-01 in the same pull request**, as a billboard above the roofline rather than the corner marker §5.1 first recorded | **No.** **Section 5, and §5.1a.** |
| M17 | Accumulating damage and the threshold | **Built.** `frostStage.ts`, `ruin_at: 6`, three appearances | Yes, §3.4 |
| M18 | The ruin | **Built.** `ruinStage.ts`, stage swap, still a click target | Yes, by reference to the carrier set |
| M19 | Ground lost for good | **Built.** `ScarredGround.tsx` | Yes, §3.5 |
| M20 | Repair and rebuild | **Built.** `crisisRepair.ts` | **No visual treatment.** **Section 6.** |
| M21 | Giving ground up, and buying it back | **Built.** `abandon`, `reclaim_cost_per_cell: 3` | **Half.** §4.5 covers the pull-back's PREVIEW and nothing covers the reclaim. **Section 6.** |
| M22 | The accuracy ladder read off the board | **Built.** Three nested raised outlines with a tier badge | Yes, §4.5, and that section is the best thing in the brief |
| M23 | Ambient motion | **Built.** `winterSnowfall.ts`, reduced-motion gated | Yes, §2.6 |
| M24 | The conclusion screen | **Built.** A standalone sheet with a derived verdict | Yes, §6b |

**Five rows are owed, and the lead named two of them.** M11, M12 and M13 are the fire's; M14 is the
fire's duration; M15 and M16 are the protection pair. **The two the lead did not name are M20 and
M21**, repair and reclaim, and they are owed for a different reason: both are things the player does
**on the island after the crisis**, so they fall outside every section of a brief scoped to the
crisis scene.

---

## 2. What shipped beyond the brief, recorded so nobody re-designs it

Three of the brief's own open items are closed in the tree, and a designer reading only the brief
would spend a pass on each.

**The lighting preset shipped, and it carries four controls the brief's table did not have.**
`WINTER_LIGHT` at `winterTones.ts:243` holds renderer **exposure** at 0.92, **shadow intensity** at
0.55, a **position ratio** for the key and the fill so the light's ANGLE moves with the preset, and
**fog near and far as ratios** (1.4 and 10 against the fair-weather 3 and 20). The brief's §2.1 asked
for a lower, flatter key in prose and had no lever for it; `posRatio` is that lever. **A crisis
preset is therefore thirteen controls, not nine**, and the three new briefs say so.

**The emissive guard was loosened, exactly as §9 item 3 said it had to be.** `winterGround.test.ts`
now asserts emissive is zero on every winter material **except a named flame face**, and it asserts
the exemption in **both** directions, so an exempt material that stops being emissive fails as well.
That discharges §9 item 3 and it leaves the rest of §9 standing.

**The flame's emissive is spent as a RAMP and the reason is worth keeping.** `winterFire.ts` records
that the first flame ran every band's emissive at 1.35, which clipped every facet to the same value
and threw the form away: the lead's words were *"i thought we established it wouldnt do this
disgusting looking flat orange square"*. It now runs three heat bands at 0.40 / 0.92 / 1.45, hottest
at the core, so the outer tongues keep enough lit term to facet. **Any later emissive face in any
crisis inherits this lesson**: a single high value is not brightness, it is the loss of shading.

---

## 3. The fire's states, its footprint, and its preview

**This section is documentation of a decided thing plus one gap, and the split matters.** M11, M12
and M13 are all **built**, and their design lives in code docblocks rather than in the brief. That is
not a defect in the code; it is a defect in the brief, and the fix is to record the design where a
designer will look for it.

### 3.1 The three states, as geometry

Plate `07-fire-four-states` puts four side by side, and the fourth is the preview.

| State | What is on the board | Told apart by |
| --- | --- | --- |
| **Proposed** | A **ghosted hearth** standing on a **ghosted patch of held ground**, in the exact terrain treatment a real warded cell gets | Translucency, no depth write so it never occludes what it is proposed over, and a **damped** flame heat. A proposal glows visibly less than a fire that caught |
| **Declared, never caught** | A built hearth with **no ember, no smoke and no held ground** | **The absence is the state.** The player paid for this and it is doing nothing, and the board has to say so |
| **Burning** | Flame, smoke column, held ground at its full footprint | The column, which is the only part visible over a rooftop |
| **Burnt out** | Blackened stones, a thin wisp or none, and the held ground **closed over by frost** | The stones going dark **and** the ground reverting. Two channels, because either alone could be misread |

**The rule the second row exists to protect.** A declaration that bought nothing is a real outcome of
this crisis and the player has to be able to see it. A hearth that simply did not appear would read
as a bug in the commit rather than as a bottom-rung result.

### 3.2 The footprint, and the one decision in it

**Held ground is not another cell.** `WinterGround.tsx` gives it a **feathered rim, pulled back and
sunk**, against the frost's hard cell edge, and that is the load-bearing decision: the frost's
boundary is a cell boundary because the player counts cells against it, and the fire's is not, because
the player does not count the fire.

**The feather is bounded and the bound is the reason it works.** It pulls the rim back rather than
softening it away, so a player aiming a fire can still see which cells are inside the patch. **A fully
soft edge would have made the one thing the player aims unaimable.**

**One definition, used twice.** `winterFireGhost.ts` owns `WARDED_TERRAIN` and `WinterGround.tsx`
puts that same object in its `TERRAIN.warded` slot rather than keeping a copy, so the preview and the
fact are the same spec by construction. **A re-tone cannot leave a preview promising the old one.**
Any later crisis with a preview should copy this arrangement rather than the tone.

### 3.3 Why the preview is a ghost of the result and not a frame round the cell

Recorded because the brief's §4.5 recommends the opposite for the tier bands and both are right.

The candidates used to be four raised bars per cell toned per tier out of the preview blues. The
lead's words: *"it shouldnt display this chunky looking blue (its fire, not snow). it should show a
preview of what the fire looks like in the actual game."* **The hue was the worse half and it was not
an arbitrary bad pick: it was the winter's own colour.** Frost is `0xdce8f2`, the frost line
`0x9fc0d8`, the cold lagoon `0x2f5a63`. Marking the one action that pushes frost back in three more
blues told the player the affordance was more of the thing they were losing to.

**So the rule for the three new briefs: a preview of an ACTION shows the action's own result,
translucent; a preview of a HYPOTHESIS about extent shows an outline.** Era one does both, in the
same layer, for two different questions, and the two must not be collapsed.

---

## 4. Duration, which is the one fire gap that is genuinely unbuilt

**Measured: `burn_rounds_by_tier` runs 2 / 2 / 3, `WinterFire`'s view carries `rounds_left`, and no
mesh in the 3D layer reads it.** So a player deciding whether to light a second fire cannot see how
long the first one has.

**The recommendation is the brief's own, made concrete.** §4.4 says to express it in the fire's own
mass rather than as a number over the board. Plate `08-fire-duration-in-the-fuel` draws that: the
**fuel stack burns down** and the **flame shrinks with it**, three steps, and **the held ground is
identical in all three**, because duration is not width and a player must not read a short fire as a
small one.

**Two constraints on whoever builds it.**

- **It must be legible at full zoom-out or it must not be the only channel.** The crisis's accessible
  surface is the DOM and the canvas is `aria-hidden`, so the fallback is the rail rather than a
  floating label. The brief says this and it is right.
- **No number is invented here.** The three steps in the plate are the tiers the tuning already
  has. **Whether a fire's remaining rounds should be a third channel in the rail, and what the copy
  for it is, is not ruled**, and section 8 carries it as owed.

---

## 5. The protection ladder, which is the row with nothing in the brief at all

**`origin/game/winter-shield-and-threat` designed this and it has NO PULL REQUEST.** Checked:
`gh pr list` returns nothing for that head ref. So on `integration` today, `shield` appears only in
`apps/web/src/winter/HardWinterSurface.tsx` and its test, and **nothing anywhere draws it**. The
lead's second example is a live defect in the shipped crisis.

> **CLOSED 2026-08-01.** That branch landed as
> #381, merged at `091a729a`, so the
> defect above is fixed and the paragraph is kept as the record of what was found rather than as a
> description of the tree. `winterShield.ts`, `BuildingShield.tsx` and `CrisisStatusMarker.tsx` are
> on `integration`.

**This section records what that branch decided rather than proposing a second answer**, because two
answers to one question is worse than none, and because that branch's reasoning is sound. Plate
`09-building-protection-states` draws it.

### 5.1 The states, and why the middle one is the hard one

> **AMENDED 2026-08-01 on the lead's ruling.** Two rows moved to match what shipped: the threat
> mark is a billboard above the roofline in the ice front's own blue rather than an amber corner
> marker, and the ladder gains a rung for a building that is already lost. §5.1a carries the
> colour reasoning, which is the durable half. The *unprotected and not threatened* row is
> unchanged and is the row the CODE moved to: `#381` had given every standing building a stone
> hexagon and it has been removed, so *nothing added* is true again.

| State | What is on the board | Told apart by |
| --- | --- | --- |
| **Unprotected and not threatened** | The building as authored, keeping whatever mastery stars it had before the winter | Nothing added. A crisis badge on every standing building would spend the one slot above a roofline saying *nothing is happening here*, which is the reading the absence of a badge already carries |
| **Unprotected and threatened** | **A billboard above the roofline**, screen-facing, clear of the roof and of anything a shield added to it: a **double chevron driving downward**, in the ice front's own `#3c7fa0`, pulsing under a motion gate | Silhouette first, in the slot the stars vacate. The chevrons point the way the harm travels, and no other badge on this island has that outline. Tone corroborates rather than carries, and it is the FRONT's tone, for the reason in §5.1a |
| **Proposed protection** | The shield geometry **ghosted** | Translucency, and it survives being ghosted because its read is an OUTLINE change rather than a tint |
| **Protected** | A **storm roof** laid over the building's own, **oversailing the wall**, with a ridge standing proud, battens serrating the slope, and a berm banked up the visible walls | Silhouette: a gable where there was none, and an eave that oversails. It survives full zoom-out and it survives a player who cannot tell the tones apart |
| **Spent** | **The ordinary building.** Shielded is binary on screen and the magnitude is deliberately not drawn | **Absence, plus a sentence in the rail.** See 5.2 |
| **Lost** | The ruin template in place of the build stage, **and a broken cross on the same billboard**, in the scene's char and slush darks | The badge says *this one is gone* in the slot the other two states use, so the three readings a player wants during a winter (safe, about to be hit, lost) are one channel and never three. A ruin is still a click target and still this node's building: the mark is added to the ruin, not instead of it |

**Why the lost rung is owed at all, given that a ruin already looks like a ruin.** The ruin is
legible standing beside its neighbours and much less legible at the settlement scale the crisis
camera actually frames, where a low broken mass reads as a building behind something. The badge is
the part that survives that distance, and it is the same argument the storm roof's oversail is made
on. It also closes the ladder: with a mark on *threatened* and a mark on *lost* and nothing on
*safe*, presence of a badge means *something has happened or is about to*, which is a rule a player
can hold without a legend.

**Why the roof and not the walls.** The camera's polar angle is 0.72 rad, about 49 degrees, and at
that tilt the roof is the largest visible surface of any building while the base is substantially
occluded by its own walls, by the snow banked against them, and by whatever stands in front. The
era-one-honest answer to winter-proofing a hut is banking earth and brush against the walls, **which
is precisely what this camera cannot see.** So the read is carried by the roof and the banking is a
secondary cue.

**Why not a tint.** Green, brick red and the deep amber are spoken for, mastery gold is reserved
outright, and a tint on a roof is the first thing an overcast rig and a pale sky take away. **And a
tint could not survive being ghosted**: at 0.6 of itself it would say the same thing the proposal
says, where an outline change survives translucency.

**One trap that is worth carrying into the three new briefs.** Alpha composites against what is
behind it, and behind a roof here is near-white snow or a near-white overcast sky, so a ghost value
that reasons correctly still resolves to a pale smear. That branch answers it by raising the ghost's
opacity well above the 0.5 the city's placement ghost uses **and** making the ghost out of the DARK
end of the palette, because a dark ghost loses far less to a pale background than a pale one does.
**Every crisis in this pass has a ghost and every one of them is over a pale ground.**

### 5.1a Why a threat is marked in the ice front's own blue, and why amber would have said the opposite

**This subsection is the durable half of the 2026-08-01 amendment.** The position moved for a
practical reason and the HUE moved for a semantic one, and only the second will be re-litigated: an
amber warning triangle is such a strong convention off this island that the next person to read §5.1
will reach for it again unless the argument against it is written down where they are reading.

**The island already spends its warm swatch on safety, and the legend says so out loud.**
`ISLAND_LEGEND` is five entries and a player is shown all five during a winter. Two of them decide
this question:

| swatch | what the legend calls it | what it means to a player |
| --- | --- | --- |
| `warded` `#c9a06a`, the warm ochre | *"a fire is holding this"* | **this ground is protected.** It is the one thing the player buys with a good answer, and it is the only warm tone on a board that is otherwise snow, ice and cold water |
| `frostFront` `#3c7fa0`, the saturated mid-blue | *"the ice front: where it reaches this round"* | **the harm arrives here, this round** |

**So warm on this board is already a word, and the word is `safe`.** An amber mark over a building
would therefore land in the **protection** family, next to the ochre the player has learned means a
fire is holding this, and a threat drawn inside the protection family reads as reassurance. That is
not a near miss, it is the exact inverse of the thing being said, on the one board where the player
is deciding which buildings to save. **The warning-triangle convention does not transfer**, because
it assumes a neutral background where amber is the only loaded colour, and here amber is loaded the
other way round first.

**And the front's own blue is not merely the residue after amber is refused, it is the accurate
word.** A threatened building is a building the ice front reaches this round, which is what the
legend's own gloss of `#3c7fa0` already says, in that swatch, to the same player, on the same screen.
Marking the building in the front's tone says *this is that*, and it makes one vocabulary out of the
ground and the buildings instead of two. `CrisisStatusMarker.tsx` reads that tone from
`WINTER_GROUND_TONES` rather than restating it, so the two cannot drift apart in a re-tone.

**Blue-on-blue is the objection to answer, and the answer is that hue is not carrying the read.**
The board under the building is pale ice, so a mid-blue badge on it is a real value step (relative
luminance 0.187 against frozen ground's 0.71) and not a tint on a tint. More to the point, every
state in this ladder is separated by SILHOUETTE first, by exactly the rule §5.1 puts the storm roof
under: the threat mark is a double chevron and no other mark on the island has that outline, so a
player who cannot tell the tones apart still reads it. **Tone corroborates; it never decides.** The
same argument is why the lost mark can be the scene's char without competing with a burnt hearth.

**Two consequences for the other three briefs in this pass, because this generalises.** First, ask
what the crisis's own legend has already promised the player about a colour before choosing a
warning colour, since a crisis with a warm protection state has spent its warning amber whether it
meant to or not. Second, if a threat and a hazard are the same fact, draw them in the same tone
deliberately: the alternative is two names for one thing, which costs the player a legend entry and
buys nothing.

### 5.2 The spent shield, which is the state most likely to ship wrong

**A shield is depleted a bite at a time and the branch's ruling is that shielded is BINARY on
screen.** So a spent shield reverts to the ordinary building outright, and geometry that vanishes
without being announced reads as a bug rather than as a mechanic.

**The requirement, stated as one:** when protection is spent, **the rail says so in words in the same
beat the geometry comes off.** That branch carries the notice in `winter/buildingThreat.ts` and
`HardWinterSurface`, which is the right place: the canvas is `aria-hidden`, so the DOM was always
going to be where the sentence lives.

**And the sentence has to distinguish spent from never-shielded**, because those are the same picture.
That is a copy line and it is not written here; section 8 carries it as owed.

---

## 6. Repair, reclaim, and the aftermath, which no section of the brief reaches

**These three are outside the crisis scene and inside the crisis**, which is why a brief scoped to
the scene misses them.

**What persists is settled and the brief says so.** `thaw.ts` reverts frost, the frost line and the
ground the frost was about to take, and keeps abandoned ground and ruined buildings. §2.7 and §6b
both state it. **Nothing here changes that.**

**What is not designed is what the player then does about it, on the island.**

| Row | What exists | What is owed |
| --- | --- | --- |
| **M20 repair and rebuild** | `crisisRepair.ts` spends material and clears one ruin. The price is derived rather than chosen: `repair_cost_per_point` is `rebuild_cost_per_ruin / ruin_at`, and the test asserts the division rather than the digit | **A visible result on the island.** A ruin cleared is a stage swap back, and a damaged building mended is frost coming off a wall. **Neither has a treatment**, and the second is the interesting one: frost climbing a building is monotone inside a winter, so coming off is a beat that only ever happens on the island afterwards |
| **M21 reclaim** | `abandon.reclaim_cost_per_cell: 3` buys back a cell of given-up ground | **Nothing about how reclaimed ground reads.** §3.5 says given-up ground should look permanently lost, *"the only state on the board with no way back"*. **It has a way back and it costs 3.** Those two sentences cannot both be the direction, and this is the sharper of the two findings in this document |

**The second row is a genuine contradiction and it is reported rather than resolved.** Either
given-up ground should stop being drawn as permanent, or reclaim should not exist, or the drawing
should carry the difference between *lost* and *lost until you pay*. **That is a design decision and
it is the lead's**, so it is section 8's first item.

> #### RESOLVED 2026-08-01: the prose was wrong, and the third option is not available
>
> **This document offered three ways out and the tree only permits the first.** The middle option
> was closed on 2026-07-30, when the failure floor ruled that crisis damage must be repairable;
> the third one, *"the drawing should carry the difference between lost and lost until you pay"*,
> was the interesting candidate and it is the one that had to be measured, because it would have
> made §3.5's *"no way back"* a true claim about the PICTURE while the cell was repurchasable.
>
> **Measured, and there is no such difference to draw.** A reclaim is `clearRuinedCell` dropping
> the cell out of `crisis_damage.ruined_cells` (`engines/game/src/crisis-damage.ts:234-239`), that
> array is mapped straight to the cell keys the scar layer is handed
> (`apps/web/src/city/CitySurface.tsx:668-671` into `three/CityScene.tsx:1054`), and
> `buildScarredGroundGroup` draws one tile per key it is given and nothing per key it is not.
> There is no healed-scar tone, no residual decal, and no third entry in `WINTER_GROUND_TONES`
> beside `warded` and `abandoned`. **A reclaimed cell is the island's own ground again**, so what
> the picture already carries is the difference between *unpaid for* and *paid for*, which is the
> right distinction and is not the one §3.5 claimed.
>
> **So era one's brief is the half that was wrong**, and §3.5 now carries a dated correction
> stating precisely what is durable (given-up ground, until 3 material a cell) and what is
> permanent (nothing). The engine had already been corrected on 2026-07-30:
> `hard-winter.ts:869` and the `reclaim_cost_per_cell` docblock both record it.
>
> **And M21 is promptable now.** The frame is a before-and-after pair, because what has to be
> settled is that a reclaimed cell is INDISTINGUISHABLE from ground that was never given up: if a
> viewer can pick out which cells were bought back, the renderer has left something behind.
> `output/imagegen/era-01-hard-winter-fire-and-shield/README.md` frame 6.
> `apps/web/src/city/three/ruinSeam.test.ts` pins the measurement, so a residual state added later
> fails there rather than quietly making the prompt wrong again.

---

## 7. What the plates settle, and how to check them

| Plate | Check it against |
| --- | --- |
| `07-fire-four-states` | Can you tell the proposed fire from the burning one without being told, and can you tell the declared-and-never-caught one from an empty cell? If not, the ghost is too solid or the unlit hearth is too small |
| `08-fire-duration-in-the-fuel` | Does the middle one read as *the same fire later* rather than as *a smaller fire*? The held ground is identical in all three; if the eye reads the third as covering less, the fuel step is doing too much |
| `09-building-protection-states` | Cover the labels. Five silhouettes, five different outlines. **The one to watch is protected against frosted**: if a storm roof and a frosted roof read as the same pale mass, the oversail is not deep enough. **Re-drawn 2026-08-01** with the threat mark where the code puts it and a mark over the ruin, so the plate and §5.1 agree again; the two badges are also the check that a mark reads at all at this size, since a badge that needs a zoom is not a settlement-scale reading |

**All three are renders and none carries a word**, on the pack's convention. The reading key is in
`crisis-reference-packs/hard-winter/README.md`.

---

## 8. Owed, and deliberately not invented

Each of these is a decision this document is not entitled to take. **No tuning number is guessed
anywhere above**, per §1 of the crisis design spec.

1. ~~**Given-up ground is drawn as permanent and is reclaimable at 3 material per cell.** Which is
   wrong: the drawing, the price, or the claim that it is permanent? **Team lead.** It changes §3.5
   of era one's brief either way.~~ **CLOSED 2026-08-01: the claim that it is permanent, and it
   needed no ruling because it was a measurable question rather than a design one.** The drawing
   keeps nothing after a reclaim, so *"no way back"* is false about the picture as well as about
   the mechanic. §3.5 of era one's brief carries the dated correction and the price is untouched.
   See section 6's resolution note for the measurement and for the M21 prompt it unblocked.
2. **The copy that announces a spent shield**, and how it distinguishes spent from never-shielded
   when the picture is identical. **Team lead**, and it is a §7.4 line: it is the only statement of a
   rule the player is given.
3. **Whether a fire's remaining rounds get a rail channel as well as the fuel stack**, and the copy
   for it. **Team lead.** The fuel stack may be enough at the camera's default zoom and is certainly
   not enough at full zoom-out.
4. **Whether frost coming off a mended building is a beat worth animating on the island**, given that
   damage is monotone inside a winter so this only ever happens outside one. **Team lead.**
5. ~~**Whether `origin/game/winter-shield-and-threat` is landing.**~~ **CLOSED 2026-08-01.** It
   landed as #381, `091a729a`, so
   sections 5.1 and 5.2 are records rather than proposals, which is what they were written as. The
   ruling at the head of this document settled the three rows where the record and the code
   disagreed; §5.1a is the part of it that generalises.

---

## 9. References

- `2026-07-30-hard-winter-crisis-art-brief.md`: the brief this addends. **Not edited by this pass**,
  and its §3.5 was then corrected in place on 2026-08-01 by the resolution in section 6, which is the
  one change to it this document is responsible for.
- `crisis-reference-packs/README.md` sections 2 and 3: why the inventory exists, and the 24 rows
- `crisis-reference-packs/hard-winter/`: plates 01 to 09 and the reading key
- `apps/web/src/city/three/winterFire.ts`: the hearth, the flame's heat ramp, and the lit/unlit split
- `apps/web/src/city/three/winterFireGhost.ts`: `WARDED_TERRAIN`, the ghost convention, and the
  blue-preview defect it fixed
- `apps/web/src/city/three/WinterGround.tsx`: `TERRAIN.warded` and the feathered rim
- `apps/web/src/city/three/winterTones.ts`: `WINTER_LIGHT`, thirteen controls
- `apps/web/src/city/three/winterGround.test.ts`: the emissive guard and its two-directional
  exemption
- `apps/web/src/city/three/winterShield.ts`, `CrisisStatusMarker.tsx`,
  `apps/web/src/winter/buildingThreat.ts`: the protection ladder as it ships, landed from
  `origin/game/winter-shield-and-threat` as
  #381 at `091a729a`. **The branch had
  no pull request when §5 was written**, which is why §5 reads as it does.
- `engines/game/src/hard-winter-tuning.ts`: `spread`, `damage.ruin_at`, `damage.bite`,
  `fire.burn_rounds_by_tier`, `fire.radius_by_tier`, `reinforce.shield_by_tier`,
  `abandon.reclaim_cost_per_cell`, `rebuild_cost_per_ruin`
- `apps/web/src/city/crisisRepair.ts` and `apps/web/src/winter/thaw.ts`: the aftermath
