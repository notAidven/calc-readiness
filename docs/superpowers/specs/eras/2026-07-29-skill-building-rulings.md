# 2026-07-29 — the team lead's rulings on skill buildings, and the record of reconciling two write-ups of them

**DECIDED (team lead, 2026-07-29). Recorded by Gabriel.** Seven rulings arrived in one session.
Four of them overturn something already merged in `../2026-07-27-era-progression-design.md`, and
every amendment lives **at the decided item**, dated and in place, with **no new `D-ERA` id**
(D-ERA6's precedent; §16 stays the authoritative list of thirty-one, which
`test/eraDecisionCount.test.ts` pins).

**This file is the reconciliation record, and it exists because the rulings were written up
twice.** Two workers were scoped onto the same twenty era documents independently and both
finished: #237 and
#238. They agree on the rulings and
**disagreed in six places about what follows from them.** §1 names all six, says which reading
landed, and why — because a landed state that silently picked would leave the next reader unable
to tell a decision from an accident. **What this file does not do is restate the amendments**;
those are at the decided items, and the "Recorded at" column of §1 points to each.

> *"i don't think it should [a building's shape should NOT tell the learner anything about the
> mathematics]. also, each lesson should get its own building, so that a user can always click
> it and review a prior lesson/skill they built and look at it again. on the building upgrades,
> we think that everything should stay the same because of the art overhead, with the exception
> of the town hall, which should retheme. also, it should definitely have the chronicler feature
> we discussed prior that allows users to see a record of all their prior lessons"*

## The seven rulings, stated precisely

- **R1 — a building's form is decoration, not meaning.** A building's shape encodes nothing about
  the mathematics of the skill it houses, and neither does **which of the six masses** a node is
  given: a `store` does not mean the skill is about collecting. **CONFIRMS and extends D-ERA8**;
  overturns nothing.
- **R2 — each lesson gets its own building, and it is the learner's way back into that lesson.**
  *"so that a user can always click it and review a prior lesson/skill they built."* **The reason
  is functional, not aesthetic.** It confirms D-ERA7's 1:1 mapping, and it **promotes D-ERA19's
  layer 3** from an availability nicety to a requirement. What it exposes is that 6 of the 62
  nodes have a building to click at all (§4).
- **R3 — skill buildings do NOT re-dress when the era turns.** A building stays as it was built,
  permanently, **because the art cost of per-era variants is not worth paying.** The **town hall
  is the sole exception** and does re-theme each era. **OVERTURNS** D-ERA8's upgrade clause and
  D-ERA7's *"Across eras"* row.
- **R4 — a chronicler ships**, and it is *"a log of what your empire looked like at each era"*
  that *"lets you basically see the progress"* — recorded as a **fourth layer** under D-ERA19,
  distinct from the shipped era timeline and from layer 2's Chronicle (era design §11.2). **And
  an entry offers BOTH DOORS** — re-read the lesson, or practise the skill again — ruled
  separately the same day: *"it should allow for both"* (§3). That half **widens** D-ERA19's
  layer 2 rather than superseding it.
  > ⚑ **R4 IS REVERSED, 2026-08-04: the same lead cut the chronicler, and the era timeline
  > with it.** It shipped as the Album (`#393`, `#514`) and the panel is now deleted; the
  > reconstruction under it is kept for the archipelago's revisited island (#568 §8.8). **The
  > BOTH-DOORS half is untouched**, because it is a ruling about the Chronicle (layer 2),
  > which was never built and is not cut — see §3, and note this is the two-letter collision
  > §6 warned about mattering for real. Era design's top banner carries the full ruling.
- **R5 — the island, the advisor and the roads DO still re-dress**, which is what **bounds R3 to
  buildings**: *"i think these should definitely be redressed. i know evan has plans to
  expand/re-theme the island."* **D-ERA26, D-ERA28 and D-ERA30 all stand as written** and no
  amendment is owed to any of the three (§2).
- **R6 — there is no generation economy.** *"just resources on lesson completion and completing
  practices make more sense. we dont need the buildings to passively produce income."*
  **OVERTURNS** D-ERA13's trickle clause, both §7 tuning rows that priced it, D-ERA7's
  *"produce"* half, and half of D-ERA23. Ruled and reasoned in full at
  `../2026-07-29-era-resource-model-design.md` §5.
- **R7 — seven of the ten era material names change**, by the recognisability rule: *"flint
  should be stone, ingots should be bronze … kilowatt-hours should be electricity, compute cycles
  should be something else and less abstract."* Shipped in `#233`; reasoning at
  `../2026-07-29-era-resource-model-design.md` §4.1a.

**R1–R5 keep the numbering the first write-up used**, so its citations still resolve; R6 and R7
are the two the second write-up carried and are appended rather than renumbered.

---

## 1. The six places the two records disagreed, and which reading landed

**Recorded rather than silently resolved.** Five of the six went the second record's way; one is a
case where the first record already had the answer the second was still asking for.

| # | The question | #237's reading | #238's reading | **Landed** |
| --- | --- | --- | --- | --- |
| 1 | **D-ERA22** — what R3 does to the three-way resolver | **Collapses to the town hall.** The shipped two-way `(node, stage)` lookup is already final for the other 62 | **STANDS, and the third axis changes MEANING** — from *the era the city is in* to *the era the building was built in*. It collapses to two-way **only if** a skill building is always raised in its own era; otherwise the built era must be stored on the placement | **#238** (§6) |
| 2 | **The nine unwired subtitle rows** | Reads as dead work | **NARROWED, not dead.** The lookup argument moves to the node's own era, each row reaches only its era's new nodes plus the hall (**72** entries rather than 322), and the rows are **per-mass** where `ERA_DRESSINGS` is **per-node**, so eleven pairs need **authoring** rather than transcribing | **#238** — a transcription done on the other reading would ship wrong strings (`README.md`) |
| 3 | **The ten style guides** | Implies hall-only relevance | **Four statuses:** live for their own buildings, live for the hall, live for island/roads/advisor, and **REFERENCE** for the re-dressing | **#238**, which all ten banners already state |
| 4 | **Does R3 reach the island, the roads and the advisor?** | **Answered: no** — R5, ruled on the Wednesday | Left open, *"the lead has not been asked"* | **#237.** R5 is taken wholesale and the open question is **deleted** rather than shipped two files from its answer (§2) |
| 5 | **What R2 repeals** | The **six shared masses** are repealed as an art vocabulary: 62 distinct buildings, 62 finished models | R2 **confirms D-ERA7's 1:1 mapping and promotes D-ERA19 layer 3**; the masses survive, and the guides author only the masses their own rosters use — **51** distinct (mass, era) looks | **#238** (§5) |
| 6 | **The chronicler** | R4's chronicler **is** D-ERA19's Chronicle, widened to both doors | The chronicler is a **new fourth layer** — a per-era log of the player's own city — and is neither the timeline nor the Chronicle | **Both, because they are two utterances and both bind** (§3) |

**Rows 1, 2, 3 and 5 all turn on the same thing, and it is worth naming once.** R3's stated reason
is **art overhead**, so a reading of R2 that requires 62 bespoke models is arguing that the lead
demanded more art in the same breath as he refused to pay for it. #238's reading — R2 is about a
building being *there to click*, not about it being *unique* — is the one the *"so that"* clause
supports, and it is the one the arithmetic in §12.1 rests on.

**Row 4 is the one that went the other way, and it went the other way on evidence.** #238 was
right that R3's words reach only *"the building upgrades"* and right not to extend it by
inference. It simply did not know the question had been put and answered.

---

## 2. R5 — the setting DOES re-dress, and that is what bounds R3

**DECIDED (team lead, 2026-07-29)**, answering the question R3 raised rather than settled:

> *"i think these should definitely be redressed. i know evan has plans to expand/re-theme the
> island."*

**So `D-ERA26` (the island), `D-ERA28` (the advisor) and `D-ERA30` (the roads) all stand exactly
as written. No amendment is owed to any of the three, and R3 is now precisely bounded to
buildings.** Recorded at era design §5.2, §5.4, §5.5, §6.4a and the three §16 rows.

### 2.1 The line is "per-era art freezes where it MULTIPLIES", and that is predictive

**R5 is not an exception to R3's art-overhead argument — it is the same argument reaching the
opposite conclusion, because the quantities are not comparable:**

| What | Per-era count | Across ten eras | Ruling |
| --- | --- | --- | --- |
| **Skill buildings** | up to 9 new, and under the old model **every** standing building | 62 built, once each; the merged model wanted 60 mass-looks and ~101 models all told | **Frozen** at construction (R3) |
| **Civic buildings** | ~4 era-exclusive types | ~40, one look each | **Frozen** at purchase (D-ERA11) |
| **The island** | one | **ten** | **Re-dresses** (R5 / D-ERA26) |
| **The advisor** | one | **ten** | **Re-dresses** (R5 / D-ERA28) |
| **The road surface** | one | **ten** | **Re-dresses** (R5 / D-ERA30) |
| **The town hall** | one | **ten** | **Re-themes** (R3's sole building exception) |

**Buildings multiply by the catalogue; the setting does not.** A building's cost is
`catalogue × eras`, which is where an unaffordable number comes from — and **it is exactly why
the hall could be excepted from R3 in the first place, being one building rather than a
catalogue.** That is worth noticing: the rule explains the exception R3 already made, rather than
being fitted to it afterwards. The island, the advisor and the roads are one each per era by
construction, so re-dressing them costs ten apiece and buys the entire visual progression.

**Stated that way it also answers the question for things nobody has proposed yet**, which a bare
"buildings only" does not. **Per-era art is frozen where it multiplies with a catalogue and kept
where it is one-per-era.** Anything added later is decided by asking which side of that line it
falls on rather than by arguing from R3's wording.

### 2.2 The two rulings support each other; the combination is not a compromise

**A stratified city needs its setting to advance, or the old buildings read as inconsistent
rather than as old.** Era design §6.4a makes the frozen city a *feature* — a mature city visibly
shows the eras it passed through, and is a spatial index into the learner's history. **That
reading depends on there being a visible *present* to be old against:** era one's thatch reads as
**early** because the ground it stands on, the road running past it and the advisor standing
beside it have all moved on. Freeze the setting too and the same thatch reads as **unfinished**.

**So R5 is what makes R2's click target legible.** The island and the roads moving forward are
what turn a frozen skill building into a record of *when* the learner earned it, which is the
whole functional purpose R2 was ruled for.

### 2.3 Three clocks in one city

Stated in one place, because it is the shortest true summary of the era model's art and the three
parts are easy to conflate. Era design §6.4a carries the same table beside D-ERA11.

1. **Skill buildings are frozen at CONSTRUCTION** — the era the learner built them in (R3).
2. **Civic buildings are frozen at PURCHASE** — the era the player bought them in, from a
   catalogue buildable only while that era is current (D-ERA11), with no renovation and teardown
   the only way back (D-ERA12).
3. **The town hall, the island, the advisor and the roads track the PRESENT era** — re-themed at
   every advance (R3's hall exception, plus D-ERA26 / D-ERA28 / D-ERA30 under R5).

The first two clocks accumulate the record; the third makes it readable as one city. Note the two
frozen clocks freeze on **different events** — one on learning, one on spending — so a quarter can
hold an era-three school beside an era-five bathhouse and both are accurate rather than a bug.

### 2.4 One consequence for planning, not for design

**`D-ERA26` is active work rather than dormant spec:** the lead confirms Evan has live plans to
expand and re-theme the island. So the island's per-era authoring is not a deferred obligation
that R3 might have quietly cancelled — it is in progress, and R5 confirms it should continue.
**This also settles the CityGuide question at §5.4 in practice:** a per-era advisor is confirmed,
so the preserved `gridwork-modern/` advisor still has an era to be assigned to.

---

## 3. R4 — the chronicler, and the ruling that a Chronicle entry offers BOTH DOORS

**Two utterances, both the lead's, both binding, and they are about different things.** One
commits to the feature and says what it is *for* — *"a record of all their prior lessons"*. The
other defines its *shape* — *"a log of what your empire looked like at each era, and lets you
basically see the progress."* Era design §11.2 records the definition as layer 4 and distinguishes
it from the two adjacent surfaces; this section records the door ruling, which is what the first
utterance turned out to need.

### 3.1 One word differed from D-ERA19, and the answer is BOTH

**D-ERA19's Chronicle (layer 2) jumps into a past skill's PRACTICE. The commitment asked for a
record of prior LESSONS.** That is a revision surface against a review surface, so it was put to
the lead rather than resolved on paper.

> **RULED 2026-07-29 (team lead): "it should allow for both."**

**So an entry offers two doors — re-read the lesson, or practise the skill again — and does not
pick.** **D-ERA19 layer 2 is WIDENED, not superseded: practice was never wrong, it was
incomplete.** Nothing in layer 2 is retracted; a door is added beside the one it already had.
That is worth stating in those words, because *"the lead asked for lessons"* invites deleting the
practice half and he did not ask for that.

### 3.2 The two-door pattern already ships, so this needs a ROUTE and not new controls

Verified at the current tip, not at the SHA the first write-up used.

**`LessonMenu` is already the pair the ruling describes** — an ungated lesson card beside two
gated practice cards:

| Card | Site | Gated? |
| --- | --- | --- |
| The lesson — label is state-sensitive | `apps/web/src/lessons/LessonMenu.tsx:164-169` | **No** — no `locked` prop is passed |
| "Practice set" | `:170-178` | Yes, `locked={practiceLocked}` |
| "Infinite practice" | `:179-187` | Yes, the same single prop |

**So the answer is not to specify two new buttons; it is to give the Chronicle a route into the
menu that exists** — and the component was built for exactly that. Its own docblock records that
it was *"Lifted out of `AdvisorLesson` so it can be opened directly from TWO places without
forking the markup"* (`:5-18`), the two being the lesson flow and the building popup. **The
Chronicle is a third caller, not a new surface.** Two things come free with it: the lesson card's
label already reads "Review lesson" / "Read lesson" / "Resume lesson" / "Start lesson" as the
node's state warrants (`apps/web/src/city/announcements.ts:299-310`), and the gate treatment below
is already built.

### 3.3 The gate cannot bite on progress, and it is not mastery-shaped

The worry worth checking was that a Chronicle entry might offer a door onto a locked card. **One
prop gates both practice cards** — `practiceLocked={!pastFoundation}`
(`apps/web/src/city/CitySurface.tsx:3172`), where `pastFoundation` is
`stage === "construction" || stage === "built"` (`:3110`). Read back through `buildStageFor`
(`apps/web/src/city/palette.ts:236-248`), practice is open for construction state `practice`,
`complete`, `gold` or `unfinished`, and shut for `not_started`, `teaching` and `preview`.

**Mastery only ever OPENS the gate, never closes it.** `deriveConstructionState` reaches
`complete` on `mastery >= 2` **before** it consults `lesson_stage`
(`engines/game/src/construction.ts`, and the function's own docblock says so in as many words), so
a well-mastered node cannot be locked. The mastery-shaped failure mode does not exist.

**Every state a past-era node can hold clears the gate, including the two that look risky:**

- **A tested-out node** is pre-seeded to `lesson_stage: "done"` at **mastery 0**, so it derives
  `complete` and practice is open. **This is where the ruling pays best:** the lesson is *unread*
  material — which is why the label says "Read lesson" rather than "Review lesson" — and the stars
  are *unearned*, so both doors are live at once and neither would have served alone.
- **A banked era** (D-ERA17) discharges its lessons through that same test-out path, so its nodes
  are `complete` too.

**One state locks it, it is not about progress at all, and the lock is CORRECT there.** `preview`
is returned **first**, ahead of both mastery and lesson stage, so no amount of learner progress
rules it out; it means the node's item bank cannot fill a valid 5-item practice set
(`ConstructionDerivationOptions.authoring_complete`). **A practice door there would open onto
nothing, so it should be shut.** The Chronicle should therefore **inherit the popup's treatment
rather than assume the case away**: card present, disabled, reason in text — which `LessonMenu`
already does (`LessonMenuCard` sets `disabled` plus a badge, and the shared gate hint renders
below the three cards). It costs nothing, being the same component.

**A separate finding, flagged rather than pursued:** the same code records that a `preview` node
*"can never reach `complete`"*, so one sitting in an era would block that era's chapter break
(D-ERA5, gated on mastery plus the trial). That is a progression problem rather than a Chronicle
problem, and it is why the case is close to unreachable today — but "close to unreachable" is not
a guarantee, and inheriting the disabled treatment costs nothing, so the Chronicle should not lean
on it.

### 3.4 PROPOSAL — fold the entries into the era timeline. Do not build a third list

**A PROPOSAL for the lead to accept or reject. Nothing here is decided and nothing is built.**
Era design §11.3 argues separately that R3 makes the chronicler *more* necessary and much cheaper;
this is about where it lives.

`apps/web/src/city/EraTimeline.tsx` shipped in `#230`: a menu-reached panel showing the ten eras
and where the learner stands. **That is already "browse the civilization era by era" — layer 2's
first half, built.** What it does not do is list the lessons inside each era or offer a way in.

- **What it lists.** Under each era, that era's completed lessons: the building's name, the lesson
  title, and mastery stars. Ordered by era, and within an era by completion.
- **What an entry DOES: both doors, per §3.1** — specified as a route into `LessonMenu` rather
  than as two buttons, so the pair keeps one definition and the entry inherits the state-sensitive
  label and the disabled-with-a-reason treatment automatically.
- **Where it is reached from.** **The era timeline, expanded** — not a new surface. Giving each
  era row a disclosure that lists its lessons costs one panel instead of two.
- **How it relates to click-a-building.** They are **the same destination reached two ways, and
  should share the destination.** The building popup is spatial ("this building, right here"); the
  chronicler is historical ("everything, in order").
- **What this gives up, so the trade is visible.** A dedicated Chronicle in the Civic Center —
  which is what D-ERA19 specified — is *in the world*, so it reinforces the hall as the civic hub
  rather than living behind a menu. If the lead wants that, the cheap version is **an entry point
  in the hall's panel that opens the timeline**, keeping one list with two ways in.

**The decision R4 needs is which ENTRANCE the Chronicle gets** — the menu, the hall's panel, or
both — not whether to build a third list. **Recommended: the timeline, with an entrance in the
hall's panel.** (Kept distinct from *"both doors"*, which throughout this file means the ruling's
lesson-or-practice pair **inside** an entry. Entrances are how you reach the list; doors are what
an entry offers.) **The affordance question is Evan's, whose lane owns the Chronicle** (§18).

**Not proposed, deliberately:** any new persistence for the door half. Completed lessons and
mastery are already in node state, which the city surface already loads. **The snapshot half of
layer 4 is a different question** and may well need storage; era design §11.2 owns it.

### 3.5 The naming collision, unresolved on purpose

*"Chronicler"* and *"Chronicle"* differ by two letters and name different things — layer 4's
per-era city log against layer 2's door into a skill. Both names are the lead's and Evan's
respectively, and neither is renamed here. Whoever builds the second of the two should expect to
rename one of them; era design §11.2 carries the row that says why.

> ⚑ **2026-08-04: the collision is now three names over two surfaces, and it very nearly cost
> a deletion.** Layer 4 was renamed to **the Album** on 2026-08-01, and the old name stayed
> live in the decision ids and the code comments — so when the lead cut it, the instruction
> read *"cut the Chronicler, the Album and the Timeline"*. Those are two panels, not three.
> The nearest candidate for a third is **the Chronicle**, which is unbuilt, is Evan's, and was
> not what the ruling meant. Read this section before acting on any list that names two of the
> three words.

---

## 4. Click-to-review: it already works, for the six nodes that have buildings

**R2's stated purpose is already served by shipped code**, so R2 buys reach on top of a working
affordance rather than needing one built. Traced at the current tip:

| Step | Site |
| --- | --- |
| A click on any placed building's group in the 3D scene | `apps/web/src/city/three/PlacedBuilding.tsx:389-391` |
| ...opens the building's anchored popup, which renders the three-card lesson menu | `apps/web/src/city/CitySurface.tsx` (`practiceLocked` at `:3172`) |
| ...whose FIRST card is the lesson and is **never** gated | `apps/web/src/lessons/LessonMenu.tsx:164-169` |
| ...labelled "Review lesson" for a finished building, "Read lesson" for a tested-out one | `apps/web/src/city/announcements.ts:299-310` |

**Practice is the gated path here, not review** — the reverse of what one might assume.

**Two real gaps, neither of them R2's to fix, and the first is sharper than "no model".**
`D1_NODE_BUILDINGS` holds six entries, so `resolveBuildingModel` returns `null` for the other 56.
In `PlacedBuilding` the clickable `<group>` is rendered **unconditionally** but the model inside it
is gated on `model && builtUrl` (`:400`), so **a node with no model contributes no geometry and
therefore no raycast target** — an empty pad that cannot be clicked. So the failure is not a
missing handler but a missing hit target, which is why it will not show up in any DOM test.
Second, **the 3D click path itself is untested**: `CitySurface`'s unit tests run with
`enableCanvas={false}` and there is no test file for `three/PlacedBuilding.tsx`, so the chain from
the `onClick` to the popup is verified by reading only. Worth a browser test at the point R2's
other 56 buildings are wired, since R2's whole premise is that the *click* works.

---

## 5. What R2 repeals, and what it does not

**R2 is about a building being THERE TO CLICK, not about it being unique.** The *"so that"* clause
is the whole of its reasoning: *"so that a user can always click it and review a prior
lesson/skill they built."* One node, one lesson, one building **instance** is D-ERA7 and is
enforced in code — `placeSkill` no-ops when the node already has a placement, and there is no
demolish and no rebuild path.

**So the six masses survive as an art vocabulary**, and the guides author only the masses their
own rosters use: **51** distinct (mass, era) looks, because five eras reuse a mass inside their own
roster eleven times over. Era design §12.1 has the derivation off the ten roster tables and the
resulting budget (~110 models becomes ~101, a saving of about 8%); `../README.md` enumerates the
eleven pairs. **Do not re-derive either number here** — one copy, at §12.1.

**Two things that follow, and both are real obligations R2 creates:**

- **A mass shared by two nodes inside ONE era still needs a separating axis**, by plan, scale or
  props and never by geometry. That set is exactly the eleven pairs, and `../README.md` records
  that the cross-era half of the old collision rule dissolves: an era-one store keeps era-one
  clothes, so it is separated from an era-eight depot by era, for free.
- **Every announced name must now be unique across the whole run**, because two eras' dressings
  for one mass can stand on the island simultaneously where previously they never met.
  `../README.md`'s naming rule carries this; it is the one place the ruling makes a guide's job
  harder rather than easier.

**One correction R2 does NOT license, and it is worth naming because the tempting version is
wrong.** D-ERA10 / INV-ERA-1 freezes **footprints** and has never frozen the six masses; §6.3 and
its §15 row scope themselves to cells throughout. Four distinct footprints (`2x2`, `2x1`, `1x1`,
`1x2`) plus the hub's `3x2` are a **land-budgeting and construction-geometry** vocabulary — the
per-era land budget is counted in cells (`findLandBudgetViolations`) and the shared fail-closed
construction geometry caches its templates per footprint (`three/constructionStages.ts`) — and they
stay for reasons that have nothing to do with re-dressing.

> **THE CONFLATION LIVES IN THE CODE, AND CORRECTING IT IS OWED — it is NOT done in this change,
> which is Markdown-only.** `apps/web/src/city/buildingAssets.ts`'s `D1_NODE_BUILDINGS` docblock
> (`:59-68` at the time of writing; cited by symbol because the lines move) still says both of the
> things this file has just contradicted, and a shipped comment is a citation site like any other:
>
> - *"Both halves are now locked: the node → MASS half by **D-ERA10** (which freezes the footprints
>   that follow from it)"* — **D-ERA10 never said that.** It scopes itself to cells throughout. The
>   footprint freeze is real and survives; the mass lock was never D-ERA10's to make.
> - *"`gridworkId` names the underlying ART MASS — the shape slot the node occupies, **which every
>   era re-dresses (D-ERA8)** and whose footprint is frozen across all ten (D-ERA10)"* — the
>   parenthesis is now **false**. Nothing re-dresses a skill building; the town hall alone
>   re-themes. The footprint half of the same sentence is still exactly right.
>
> **A third site, in the same file's top docblock** (`:22-27`), carries the same withdrawn clause as
> its *reason*: the `gridwork-modern/` set is kept because *"they are a later era's art, **since
> D-ERA8 re-dresses every skill building per era** rather than replacing it once."* Under R3 the
> premise is gone while the conclusion holds — see §7, where the set is art for later eras' own new
> nodes — so this one needs re-reasoning rather than deletion.
>
> **And `eraDressing.ts` owes a fourth**, which is the sharpest of the four because it tells the
> next reader the wrong thing to do. `CURRENT_ERA_ID`'s docblock ends *"when it does, the call sites
> that pass this today take the live era instead and **nothing else about the mechanism changes**"*
> (`:106-109`). After R3 that is true of the hall and **false of every skill node**: the live era is
> precisely the wrong key for one, per §7. Whoever wires era two will read this line as a licence to
> do the thing that silently drops `"Hut Cluster"`.
>
> **Deliberately deferred rather than forgotten.** These are four comment corrections in two `.ts`
> files, changing no behaviour, and they would flip this change across the CI scope filter in
> `.github/workflows/invariants.yml` from the one-minute prose path to the full gate set — the
> Chromium browser suite and the web build — to land four prose edits. **They want their own
> two-file PR**, and every string to change is quoted above so that PR is mechanical rather than
> investigative.

---

## 6. D-ERA22 — the decision stands; skill buildings use their home era

**RESOLVED 2026-08-18:** the home-era branch below is final. Banked and catch-up skill
buildings use the era that owns their node, derived with `getEraOfNode(nodeId)`. No built-era
field or migration is needed; skill resolution remains two-way. The Town Hall alone uses the
live era.

**D-ERA22 is amended, not deleted.** Before R3, `era` meant **the era the city is in** — ambient,
re-resolved at every advance, which is exactly the shape `eraDressing.ts`'s `CURRENT_ERA_ID` has.
After R3, `era` means **the era the building was built in**: a property of the thing rather than
of the moment. Same arity, different semantics, and the difference is what decides how much of
D-ERA22 is left. Full amendment at era design §12.2.

- **The town hall keeps D-ERA22 verbatim** and is the only building that does. It re-themes at
  every advance, so its resolution is genuinely `(stage, live era)`. It needs **one model per era,
  not three**, because `townHall.ts` records that the hall renders only its `built` model and has
  **no stage progression** — ten `built` GLBs, of which one exists. The mechanism is a per-era row
  on the island descriptor's `stage_models`, not a resolver rewrite, and it lands in `townHall.ts`,
  which already has its own glob and resolver disjoint from the skill glob.
- **For skill buildings it collapses to two-way IF a skill building is always raised in its own
  era** — then the built era is `getEraOfNode(nodeId)`, static data, and nothing need be stored.
- **If a skill building can be raised while the city stands in a different era**, the built era is
  **not** derivable from the node and **must be written onto the placement** — which makes
  resolution genuinely three-way *and* adds a persistence requirement that does not exist today
  (`citySession.ts` keeps placements in memory and persists nothing, **O-15**), so a reload could
  re-derive a building's look differently.

> **ANSWERED 2026-08-18:** D-ERA17 banked buildings and D-ERA18 catch-up buildings arrive in
> each node's home-era clothes. Test-out changes the teaching path, not the node's authored era.

**The guard replacement is unaffected either way**, and one hazard is worth carrying forward from
the first write-up because it survives both readings. The literal `18`
(`buildingAssets.test.ts:104`) and the derived `D1_NODES.length * MODEL_STAGES.length` (`:84`)
both still have to be dealt with, and `D1_NODES` (hard-coded at `:19`) has to stop being six
literal ids. **The new hazard is the population's source:** a count derived from
`D1_NODE_BUILDINGS` passes at six while 56 nodes sit silently unmodelled, because that registry is
the thing under test. **Derive it from `ERA_SEQUENCE`**, which is the authority for which nodes
exist. The disjointness assertion at `:107-123` is **more** load-bearing after R3, not less, since
the hall is now the one building whose model set grows with the eras. **Fail-closed placeholder
behaviour is also more important**, because a missing model is now permanent for that building
rather than corrected at the next advance.

---

## 7. What this change did NOT touch, and why

- **The nine unwired subtitle rows are still owed** and are re-scoped rather than cancelled
  (`../README.md`). The one code consequence recorded but **not fixed** is that
  `buildingSubtitle(nodeId, eraId)` is called with the **live** era, which is right for the hall
  and wrong for a skill node once a second era exists: in era five,
  `buildingDisplayName("NUM.2", "medieval")` would return bare `"Dwellings"` and silently drop
  `"Hut Cluster"`, because `ERA_DRESSINGS` has no `medieval` row for `NUM.2` and never will. **The
  correct key is the node's home era**, which makes the skill path *simpler* than it is today
  since the `eraId` parameter drops out of it. Changing it is a behaviour change and belongs with
  whoever wires era two. **It is recorded HERE and NOT in `eraDressing.ts`**, whose docblock still
  says the opposite in as many words — §5's fourth owed correction.
- **The preserved `gridwork-modern/` model set.** Its README and two other sites justify keeping it
  as *"a later era's art, since D-ERA8 re-dresses every skill building per era"*. Under R3 that
  reasoning changes shape — the set would be art for later eras' **own new nodes** — but the
  conclusion (keep it, unwired) is unchanged and *which* era wears it is explicitly open. Left for
  Evan with the era assignment.
- **`gridworkId`** keeps its job under #238's reading of R2, since the guides still dress masses.
  No change, and no naming decision is owed.
- **The clocklessness sweep** that R6's record recommends. It is a code change and its population
  needs its own argument. Still owed, still Gabe's.
- **`docs/Post_MVP_Backlog.md` item 16** is amended for R3 rather than closed: the cosmetics Shop
  is still an era violation, on the narrower and clearer basis that a finish which *"travels to
  every island"* overrides the era a building was built in, permanently, because nothing will ever
  redraw over it.

---

## 8. The notice to Evan is still OWED

**These sections are Evan's.** The team lead authorised editing them, and
[issue #181](issue #181) is the vehicle for the
notice so that he meets this as a comment rather than as a diff. **The comment has not been
posted** — it needs a seat with write access to issues.

**The decided items these rulings overturn, which is what the notice has to name:**

| Decided item | What was overturned | By |
| --- | --- | --- |
| **D-ERA8** | *"Upgrading changes only the look — same building, same plot, same lesson"* — narrowed to the town hall. The rest of D-ERA8 is confirmed and extended | R3, R1 |
| **D-ERA7** | The *"Across eras: re-dresses automatically every era"* row, and the *"produce"* half of the economic-role row | R3, R6 |
| **D-ERA13** | The *"trickle from skill buildings into a storage cap"* clause, and both §7 tuning rows that priced it. The lump survives in full | R6 |
| **D-ERA23** | **Split.** The *"skill building's output"* half has no subject left; the civic-contribution half survives unchanged, and its stated rationale is void rather than merely weakened | R6 |
| **D-ERA22** | Amended: the Town Hall keeps the live-era axis; skill buildings resolve two-way from each node's home era with no stored field (§6) | R3 |
| **D-ERA19** | Layer 3 promoted to a requirement; a fourth layer added; **layer 2 widened to both doors** | R2, R4 |
| **D-ERA26, D-ERA28, D-ERA30** | **Nothing.** All three stand as written, tested against R3 and held | R5 |

**Nothing is assigned to him beyond reading it, except the `gridwork-modern/` era assignment
at §7.**
