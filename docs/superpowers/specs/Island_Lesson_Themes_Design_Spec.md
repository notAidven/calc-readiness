> # ⛔ LEGACY — SUPERSEDED, AND AUTHORITATIVE FOR NOTHING
>
> **Ruled by the owner, 2026-07-29, verbatim: _"island_lesson_themes_design_spec is just
> completely legacy. this needs to be marked as such. there is no such thing as multiple
> islands now — it's all one island and it changes based on the era."_**
>
> **Do not author from this file.** Not its per-node framings, not its themes, not its
> personas, not its hue families, not its narrative throughline. Every one of those is
> written for a world that no longer exists. Nothing below is a live instruction and
> nothing below wins a conflict with anything.
>
> **What replaced it.** The archipelago — ten parallel islands, one per domain, visited
> and left — is gone. There is **one city**, and it **advances through ten eras**
> (`2026-07-27-era-progression-design.md`, D-ERA1, merged as #177; the era node sets are
> authored data in `packages/skill-graph/src/eras.ts`, #180; the twenty-one era documents
> are under `eras/`, #194). The metaphor moved from *which island you are on* to *how far
> the one city has come*.
>
> **Why a per-domain theme cannot simply be re-labelled an era theme**, so nobody tries:
>
> - **An era is not a domain.** `ERA_SEQUENCE` carries no domain field at all (INV-ERA-5).
>   Three domains span more than one era and three eras hold more than one domain, so
>   several of this document's rows have no single era to move to. Polynomials alone is
>   spread over the Classical, Renaissance and Industrial eras.
> - **The century is inside the framings, not just around them.** This document's rows
>   build their word-problems out of their own props — an Age-of-Sail launch-day signal
>   rocket for Polynomials, a telegraph office and a railhouse for Exponents & Radicals, a
>   volcanologist's gas-ppm sensor for Linear Equations, a dragon's hoard for Exponential
>   & Logarithmic. The eras those domains actually sit in are, respectively, Classical,
>   Neolithic, Bronze Age and Information Age. Dropping the "island" wrapper does not
>   reach the props.
> - **The buildings here are a rebus and the era model forbids that.** D-ERA8 rules that a
>   skill building never symbolises its skill; it is the ordinary architecture of its era
>   with a lesson assigned to it. Several of this document's building names are chosen to
>   express their mathematics (the Reducing Bench, the Blending Vat, the Proving Cauldron),
>   which is the approach the era design records as tried and rejected (§15).
>
> **What is retained, and why this file is not deleted.** It is the record of how the
> theming question was thought about, including the three narrative frames of §1.6 and the
> two worked exemplars, and a stripped file would invite someone to re-propose all of it
> from scratch. Read it as history. The annotations already inside it (Gabe 2026-07-27 on
> advisor ownership, Evan 2026-07-28 on the CityGuide and Q3/Q11/Q12) are likewise history
> now; they are kept because they record decisions whose *substance* survived the model
> that occasioned them.
>
> **One live consequence, and it is not resolved by this banner.** This was the only
> document carrying the **lesson-side framings** job — how a lesson frames its mathematics,
> its word-problem contexts, its motif. The era style guides do **not** carry that job:
> their remit, per `eras/README.md`, is materials, structural language, roof and support
> forms, palette, ornament, visible technology, the signature move, the island, the advisor
> and the subtitle row, and D-ERA8 explicitly decouples a building from the lesson inside
> it. **So retiring this document leaves a hole rather than transferring a job.** That hole
> is Evan's to fill or to delegate, it is item 1 of
> `docs/Evan_Design_Decisions_Consolidated.md`, and until it is filled a lesson author has
> no framing authority to read. Do not close the gap by quietly reading this file anyway.

# Island-Themed Lessons — Design Spec (v0.1, PROPOSED) — **LEGACY, see the banner above**

_A cross-lane design doc for **island-themed lessons**: framing each skill-graph
domain as a themed **island**, and narrating that island's lessons (prose,
advisor voice, word-problems, examples/CFU, visuals, and the building each node
builds) to match its theme. It starts by mapping the **starter island — D1 (Real
Numbers & Arithmetic)** in depth, gives a reusable template, works one **later
island — D5 (Rational Expressions)**, re-themed as a medieval-fantasy **crafting
guild**, to full authoring depth as the fantastical exemplar, and gives PROPOSED
themes for the rest. The archipelago is arranged as an **arc from the
grounded/realistic starter city toward the fantastical** on later islands; §1.6
adds a **narrative throughline** binding those islands into one voyage — an envoy
readying the archipelago for the calculus "attacks" endgame — without flattening
their distinct themes. It is a content + game **presentation** design:
theming is narrative/skin only. It changes **no** node identity, skill semantics,
answer keys, mastery, or data contracts — everything here is additive to the
frozen lesson-content schema and the frozen item bank._

**Status:** PROPOSED / draft for team review. D1 section is authoring-ready; the
**D5 fantasy exemplar** (§4.1) is worked to authoring depth (PROPOSED); the
remaining D2–D9 themes are placeholders to refine, and **D10 (the new Geometry
island, added 2026-07-24) is an UNASSIGNED placeholder needing Evan + Anthony**.
A **narrative throughline** binding the islands into one voyage is newly PROPOSED
(§1.6, 2026-07-26): it recommends one of three candidate frames and leaves the
taste calls as open questions (§6 Q8–Q12).
**Owners:** **Anthony** (lesson content / advisor dialogue / word-problem
contexts — `engines/lesson`, `content/lessons`, `packages/item-bank`) and
**Evan** (game/city visuals, island world, per-node buildings — `engines/game`,
`apps/web` city surface). **Gabe** owns the registry + shared schema; this
feature deliberately needs **no** change to either.
**Scope:** the narrative/presentation layer of lessons per domain. Depth-first on
D1 (the only built island at MVP); D2–D9 are proposals for the ranked expansion.
**Companion docs:** `docs/Node_Spine_v4.md` (domain + node content authority),
`packages/skill-graph/src/skill_graph.json` (registry, source of truth for node
IDs/domains/edges), `docs/superpowers/specs/D1_City_Builder_Design_Spec.md` (D1
game lane), `docs/Game_Visual_Design_Brief.md` (locked art direction + per-domain
hue families), `apps/web/src/city/buildingAssets.ts` (`D1_NODE_BUILDINGS`, the
already-civic building names), `content/lessons/d1/*.json` (the six D1 packs),
`docs/PRD_Full.md` (advisor NPC, neighborhood/storm loop), `OWNERS.md` (lanes).

> **⚠ Annotation — Gabe, 2026-07-27 (FINAL): the advisor VOICE is EVAN'S.**
> *(Annotated inline in Evan's doc rather than restructured; nothing below is
> rewritten or deleted. This replaces a 2026-07-26 annotation rather than stacking
> on it, so there is one answer here and not three.)* The **Owners** line above
> assigns "advisor dialogue" to Anthony for every island. That is **superseded**:
> the advisor **persona and voice belong to Evan, for every island**, because he
> does all of the design — `docs/Content_Authoring_Split.md` §1.1. Read every
> "advisor voice / dialogue → Anthony" in this doc — §1.1 channel 6, §2.2, §3's
> template line, §4.1.2, the D10 note in §4, and §5's ownership bullets — as "→
> **Evan**". A lesson author writes in the voice Evan has set and, where an island
> has none, uses a plain unnamed advisor voice and may offer a persona only as a
> labelled proposal for him.
>
> **For the record, since this moved twice:** a 2026-07-26 rule briefly gave the
> persona to whoever authored the domain's lessons, and registered **the Town
> Foreman** for D2 on that basis. That rule is reversed and the Town Foreman is now
> a **proposal Evan inherits** (`.cursor/skills/author/reference.md` §6). It was
> never implemented in any lesson string, so nothing in content depends on the
> outcome.
>
> **Nothing else moves.** Evan already kept the island world, the per-node
> buildings, the hue families and the NPC art slot; the *voice* now joins them, so
> this consolidates rather than splits. §1.4's skin-only boundary is untouched, and
> a lesson author still owns the prose, the word-problem contexts and the CFU
> rewraps. D1 (City Clerk / Deputy Mayor, §2.2) and D5 (Guild Master Artificer,
> §4.1.2) stand as written and are Evan's to confirm or revise.

---

## 1. Overview & intent

### 1.1 What "island-themed lessons" are

Every domain in the skill graph is presented as a **themed island** in the
student's world, and the **lessons for that island are framed to match the
island's theme**. The math is unchanged; the *wrapper* is themed. Concretely,
one theme reaches the student through six channels:

1. **Lesson prose + advisor narration** — the `mini_lesson` paragraphs (spoken by
   that island's **advisor NPC**, one paragraph at a time) use the island's
   world and vocabulary.
2. **Word-problem contexts** — CFU and practice prompts are set in the island's
   world (floors of a building, land parcels, budgets, tides…), not abstract
   symbol-only drills.
3. **Examples / CFU / practice** — the running examples and the check-for-
   understanding question share the island's motif (with the underlying numbers
   and required answer form **unchanged**).
4. **Visuals** — inline diagrams can be skinned toward the theme (the existing
   SVG diagram ids are already "theme-aware"; new themed art is additive).
5. **The building each node builds** — every node is one building on the island,
   already themed for D1 in `D1_NODE_BUILDINGS` (Town Hall, Public Library, …).
6. **The advisor persona** — each island has its own scripted advisor NPC
   (PRD §1.4) whose voice/role fits the theme (e.g. a city clerk for D1).
   *(⚠ Gabe, 2026-07-27: the person who defines that persona is **Evan** —
   `Content_Authoring_Split.md` §1.1. The channel itself is unchanged.)*

### 1.2 Why (the bet)

- **Immersion.** The product's core metaphor is "the city *is* your math
  knowledge" (`docs/Game_Visual_Design_Brief.md` §1). Right now the **buildings**
  are civic-themed but the **lesson prose is generic**. Theming the lessons makes
  the whole surface cohere: you learn signed numbers *because* you are running the
  Town Hall, not next to a building that happens to be a Town Hall.
- **Narrative-tied learning.** For an anxious, underprepared learner ("Maya",
  §2 of the brief), a concrete civic context ("floors above/below ground")
  is a friendlier on-ramp than "$-8 + 6$", and gives every skill a reason to
  exist in the world. It reinforces retention by anchoring abstract operations to
  a persistent, growing place.
- **Cheap and safe.** Because theming lives entirely in prose/presentation, it is
  additive: no schema change, no new contract, no re-scoring.

### 1.3 Terminology: island = domain = neighborhood = district

These are the **same thing** seen from different lanes; call it an **island** in
student-facing world/narrative:

| Lens | Term used | Where |
| --- | --- | --- |
| Curriculum / data | **domain** (D1…D9) | `skill_graph.json`, `Node_Spine_v4.md` |
| Game UI / mastery loop | **neighborhood** / **district** | `PRD_Full.md`, `D1_City_Builder_Design_Spec.md` |
| World / narrative (this doc) | **island** | `worldLayout.ts` already renders D1 as a "starter island" in a lagoon |

The world is an **archipelago**: the starter island (D1) sits in a teal lagoon
today; the other eight are the "distant locked districts on the horizon" of the
D1 spec, reframed as **other islands** you sail to as content lands.

### 1.4 Hard guardrails (theming is a skin, never a contract)

- **Same math, same answers.** Theming rewraps the *story* around a prompt; the
  quantities, the canonical `answer_key`, the `accepted` forms, and the required
  representation/simplification stay **identical**. A themed NUM.S CFU still
  evaluates to `-2`.
- **Additive to the frozen lesson schema.** All theming fits existing fields
  (`mini_lesson`, `cfu.prompt`, `cfu.hint`, `visuals`); it introduces **no new
  JSON fields** (`content/lessons/d1/README.md`, `apps/web/src/lessons/types.ts`).
- **No registry / semantics change.** Node IDs, domains, prerequisite edges,
  difficulty tiers, and mastery rules are untouched (`OWNERS.md`: registry is
  Gabe's, all-hands to change — not needed here).
- **Accessibility survives the theme.** Meaning is never carried by flavor alone;
  the actual math operation and answer must stay legible without the story
  (`Game_Visual_Design_Brief.md` §8).

### 1.5 The archipelago's arc: grounded → fantastical

The islands are arranged as a **voyage**: the world starts **grounded and
realistic** at the starter city and drifts toward the **fantastical** as the
student sails to later islands. D1's civic city is deliberately the most literal,
low-magic on-ramp (a friendly place to be a nervous beginner); the
mid-archipelago **tips into overt fantasy** at the crafting-guild island (**D5**,
§4.1 — a blacksmith's forge + an alchemist's station), and the outer islands lean
further into arcane/celestial imagery. This is a **register** arc only — a
travel-through-a-storybook feel — and it changes nothing structural: math, node
identity, prerequisite order, and answers are invariant on every island (§1.4).
Concretely, **D1–D4 stay grounded** (civic city → frontier boomtown → volcano
watch → seafaring shipyard — each a specific, vivid, historical/place-based
setting), **D5 is the threshold** into fantasy, and **D6–D9** carry the
fantastical register forward (see the §4 map). The starter island (D1) stays
**exactly as specified in §2** — the arc begins *after* it.

#### D10 sits by AVAILABILITY, not by its number

**D10 Geometry is numerically last but opens in the FIRST wave.** Read the
registry rather than the label:

- **`NUM.4` is the archipelago's single gateway.** `EXP.1` (D2), `LIN.1` (D3),
  `POL.1` (D4) and `GEO.1` (D10) all list exactly one prerequisite — `NUM.4`, a D1
  node. Finishing the starter island opens **all four grounded islands at once**;
  Geometry is not "later" than any of them.
- `GEO.2` depends only on `GEO.1`, and **nothing anywhere depends on either**.
  Trigonometry does *not* need it (TRG draws on NUM / RAD / FUN).

So Geometry is a **first-wave, self-contained side branch**, not a capstone.
Theming it as a post-trigonometry fantasy peak would put the archipelago's most
fantastical island in front of a student who has only just left home.

It therefore sits **inside the grounded run** (§4 orders it between D3 and D4,
before the D4 hinge) and is framed as an **optional excursion** — a short voyage
you may take as soon as you leave home, and need never take at all. That the graph
makes it optional is a feature worth leaning into narratively rather than hiding:
it is the one island that exists to *measure the others*.

### 1.6 The narrative throughline (PROPOSED, added 2026-07-26)

§1.5 gives the archipelago a **register** arc (grounded → fantastical); this
section proposes the **story** that rides it — a reason the player is sailing, who
they are, what threatens the world, and how it ends — so the game reads as one
voyage rather than nine unrelated themes. The rule is the same as everywhere else
in this doc: **the story is a skin.** It explains *why* you do the math; it never
changes *which* math, *what* the answer is, or *when* a node unlocks (§1.4). Each
island keeps the distinct theme §2 and §4 already give it — the story **allies
with** those themes, it does not overwrite them into samey chapters.

#### 1.6.1 Three candidate frames

Each frame is a one-paragraph pitch — **who** the player is, **why** they cross the
archipelago, **what** threatens it, **how** it ends — with its strengths and what
it costs.

**Frame A — "Chart the Archipelago" (the Wayfinder).** You are a wayfinder who has
just made landfall and been handed the keys to the home city (§2.1); your charge is
to sail outward and **chart and connect** a newly-settled archipelago, island by
island, from the home lagoon into ever-stranger waters. The season's **storms**
rise at each island, and past the last isle something is coming. It ends when the
charted, connected chain stands as one.
- *Strengths:* the tightest fit for the existing D1 premise ("just landed, handed
  the keys") and the grounded → fantastical sail ("stranger waters"); D10 Meridian
  Point — the camp that **measures the others** — becomes the emblem of the whole
  vocation; the threat stays gently backgrounded, which suits an anxious learner.
- *Costs:* if the whole job is charting, D10 reads as **required**, which the graph
  forbids (§1.5); "chart" is a soft verb with weak stakes; and the endgame defense
  feels bolted onto what is really an exploration story.

**Frame B — "Keeper of the Weathering Isles" (the Steward).** You are the steward
the home city entrusts with the archipelago's **upkeep**. The islands are
inhabited, living places that **weather when neglected**; you travel the chain
keeping each one running from its Town Hall, because the whole archipelago is
bracing for what is coming. It ends with a well-kept, resilient chain meeting the
arrival in good repair.
- *Strengths:* makes **island decay** and the **Town Hall hub** the literal heart
  of the story rather than decoration; calm and non-urgent by nature.
- *Costs:* a caretaker is a low-energy protagonist; the outward **voyage** is weakly
  motivated (why keep sailing to stranger isles just to tidy them?); the climactic
  defense is under-set-up; and upkeep risks reading as chores.

**Frame C — "Ready the Archipelago" (the Home City's Envoy). ← RECOMMENDED.** The
moment your home city's own foundations stand, word reaches the lagoon that
**Calculus is coming**. You sail out as the city's envoy to **rouse and ready** each
island — each already its own place, with its own trade and people — so that when
the arrival lands, the whole archipelago stands **together**, not one island alone.
The checkpoint **storms** are the arrival's outriders, felt island by island long
before the end; the endgame is the arrival itself.
- *Strengths:* unifies the **storms and the endgame as one antagonist at two
  scales** (outriders → arrival), so the calculus "attack" becomes the literal spine
  the whole voyage prepares for; preserves each island's distinctness **by design**
  — you *ally with* a place's existing theme, you never convert it; handles D10
  gracefully (an ally you *may* call on but never must); and gives the CityGuide an
  obvious reason to travel and narrate.
- *Costs:* "something is coming" flirts with the urgency/threat tone the brief bans
  (`Game_Visual_Design_Brief.md` §2) and must be defused; and it leans hardest on
  the **endgame**, which is roadmap-only today (`Game_Architecture_Blueprint.md`
  §8.2), so its payoff is currently foreshadowed, not shipped.

**Recommendation — Frame C**, adopting **A's far-horizon pacing** (the arrival is a
distant certainty, never a countdown) and **B's return-and-repair beat** (an isle
left behind weathers; you set it right). It is the only frame in which the
mechanics we already have — storms, decay, the outward voyage, and the roadmap
endgame — become **one story** instead of four decorations, and the only one that
turns D10's graph-optionality into a *feature* of the fiction rather than a hole to
explain. Its one real risk is tone; the guardrail in §1.6.5 keeps the arrival a
calm horizon and a **readiness** goal (which the PRD already frames as "a launch
point rather than the finish line", PRD §16.1), never an alarm.

#### 1.6.2 The recommended frame, in full

**Premise.** An archipelago of freshly-settled islands rings a home lagoon. Each
island is a real, distinct place — a civic city, a gold camp, a volcano watch, a
shipyard, a crafting guild, and stranger isles beyond — and the sea between them is
charted but not yet *held*. When the home city's foundations top out, its watchers
read the sign the star-spire reads from far out (D8): **Calculus is on its way** —
not a monster, but a rising tide of genuinely harder ideas the islands have never
had to stand against.

**The player's role.** You are the home city's **envoy and builder**. You do not
conquer the islands; you **ready** them — raise each one's buildings by learning its
skills, clear the storm that proves it is ready, and link it into a chain that can
act as one. Your constant companion is the **CityGuide** (§1.6.4), who sails with
you and introduces you to each island's own advisor.

**The antagonist & the stakes.** The threat is **Calculus itself**, arriving as the
roadmap **"Attacks = Calculus I"** endgame (PRD §16.1, `Game_Architecture_Blueprint.md`
§8.2) — limits, derivatives, and integrals breaking over the finished city, met by
the prerequisite skills you built. It is **non-punishing** (a defended set-piece,
never a loss) and it is a **far horizon**: nothing rushes you toward it. Its
outriders — the per-island **storms** — are what you actually face along the way.
The stakes are cumulative and calm: every island you ready is one more that will
stand when the tide comes in, and the home city you started from is the thing you
are readying them *for*.

#### 1.6.3 How each island fits (its theme intact)

Each island keeps the premise, hue, and node list §2/§4 assign it. The story only
adds a **job in the muster** — a reason this particular place matters to the voyage
— so the themes stay distinct and none is flattened. **The §4 table is unchanged.**

- **D1 — Foundations Isle (civic starter):** *home.* The lagoon city whose
  foundations you raise first; when its hub stands and its storm clears, the sign
  arrives here and you set sail. It is the island you are readying all the others
  *for*.
- **D2 — Boomtown Square (a frontier town that keeps growing):** *the first port
  out.* A raucous town whose fortunes **multiply**; you ready it as-is — you ally
  with its restless boom, you do not tame it into a second civic city.
- **D3 — Emberwatch (volcano station):** *the early-warning post.* Where you first
  learn to hold a reading **within tolerance** and set safe-zone limits — the
  threshold discipline the arrival will demand at scale. Its storms read as the
  mountain's own tremors.
- **D10 — Meridian Point (survey camp):** *the self-sufficient ally — optional.* The
  cartographers who **already took the measure** of these waters and drew the chart
  you sail by. Because it measures the others, the muster may *use* its chart but
  never *needs* it — so you may sail here early, or never, and lose nothing. This is
  how the story honors D10's optionality (§1.5): the one ally who needs no readying.
- **D4 — Bowsprit Bay (shipwright's yard):** *the crossing.* The last grounded port;
  readying it means **building the ship** (its arcs and areas) that carries you to
  the fantastical isles — so D4 is literally the boat, and the story's register tips
  here exactly where §1.5 puts the threshold.
- **D5 — Verdigris Hold (crafting guild):** *the armory.* The first overtly-fantastical
  isle; the guild forges and brews the matériel the chain will need, and takes you on
  as a journeyman. Its math stays mixtures and rational expressions (§4.1); the
  muster only gives the recipes a purpose.
- **D6 — The Gearwright's Menagerie (automata workshop):** *the makers.* The isle of
  tireless machines — each a device of one input, one output (functions) — the
  archipelago's built helpers.
- **D7 — The Skyway Caravans (mountain passes / sky-rails):** *the connective
  tissue.* The routes along which readied islands actually **stand together** —
  where "the chain acts as one" stops being a metaphor. Slopes, rates, and crossings
  are the logistics of the muster.
- **D8 — Wyrmvault (dragon's hoard & star-spire):** *the treasury and the long
  watch.* The compounding hoard funds the chain, and the **star-spire** is where the
  arrival is first *seen* at magnitude — the in-world source of the "something is
  coming" sign.
- **D9 — The Moonwatch Spire (celestial tides):** *the eve.* The final, most
  fantastical isle, whose beacons and moon-tides close the voyage back to the home
  lagoon and D1's Clock Tower (as §4 already notes) — the last vantage from which the
  whole readied archipelago is seen at once, on the eve of the arrival.
- **Endgame — the arrival.** With the chain armed (D5), built (D6), linked (D7), and
  funded and watched (D8–D9), Calculus breaks over the home city as the **"Attacks =
  Calculus I"** set-piece — the climax the whole voyage has readied for, and the
  launch point past readiness (PRD §16.1).

#### 1.6.4 The mechanics the story explains

The point of the frame is that it **explains the game we already have**, beat for
beat — the story is the reason for each mechanic, not a coat of paint over it:

- **The voyage arc (§1.5).** The outward sail *is* the grounded → fantastical
  register shift — the envoy travelling from the literal home city into stranger
  waters. The story rides the arc; it does not add a second one.
- **The Town Hall (each island's hub).** Every island's hub **already stands when you
  make landfall** — the seat you rally the island from, where you launch interleaved
  practice and read the island's condition, and where its advisor is hosted (Town
  Hall spec `2026-07-25-town-hall-design.md` §5, D-TH5). *(This follows the
  in-progress change making each hub **pre-seeded and already built**, so an island
  always has its hub — narratively you arrive to a standing hall, you do not found
  it.)*
- **Storms as the arrival's outriders.** The per-neighborhood checkpoint **storm** is
  the tide's advance guard, felt at one island at a time — a **non-punishing**
  set-piece you clear to prove the island is ready (`Game_Architecture_Blueprint.md`
  §8.1). Nothing about the storm's rules changes; the frame only gives it a reason to
  blow.
- **Weathering as the isle you left behind.** An island slips back toward weathered
  while your attention is elsewhere; returning for an interleaved session at its Town
  Hall **sets it right** (`2026-07-25-island-decay-and-gold-design.md` §4). This is
  the "keep the chain ready" beat — spaced retrieval in costume — and it stays
  cosmetic and non-punitive (the paint fades, never the mastery stars).
- **The CityGuide as the one voice that travels.** The hard-hat guide
  (`CityGuideCharacter`) is your companion for the whole voyage — the single narrator
  who carries across islands and **introduces each island's local advisor persona**
  (the D1 City Clerk, the D5 Guild Master Artificer, …). This gives one diegetic
  reason for *both* a travelling narrator and per-island voices, which is one way to
  reconcile the "one guide vs. one-per-island" open question (§6 Q3) without deciding
  it here.

> **⚠ Annotation — Evan, 2026-07-28 (FINAL): the CityGuide does NOT travel. There is no
> travelling narrator; the guide is a LATER ERA'S LOCAL ADVISOR.** *(Annotated rather than
> deleted, per this file's convention — the bullet above stays as written. It is quoted
> here on purpose: the travelling-narrator idea was deliberate and someone reading a
> stripped file would re-propose it.)*
>
> The bullet above is **superseded twice over**, and the first reason is structural. It
> reconciles *"one guide vs. one-per-island"*, and **islands are gone**: `D-ERA1`
> (`2026-07-27-era-progression-design.md` §1, §3) replaced the archipelago with **one
> continuous city in ten eras**, so *"carries across islands"* has nothing left to carry
> across. Every "island" in this document reads as an **era** wherever the geography is
> what mattered.
>
> The second reason is a decision rather than a renaming. **`D-ERA28` makes the advisor
> per-era art**, re-dressed at every advance as the ground and the roads are — so the advisor is
> *local by construction* and there is no seat left for a narrator who
> is local to none of them. *(This clause read "exactly as the buildings and the ground are".
> **D-ERA28 is untouched by the 2026-07-29 re-dressing ruling** — the advisor still re-dresses —
> but the buildings no longer do, so the comparison has been corrected to the surfaces that
> still hold. The argument is unaffected.)* Era one's advisor is **Oru**, a Prehistoric elder
> (`eras/era-01-prehistoric/style-guide.md` §6c). The CityGuide is not retired: its hard
> hat, hi-vis jacket and chest skyline badge are roughly **eras 8-10** vocabulary, so it is
> **preserved and deliberately unwired** in code, waiting for its own era
> (`apps/web/src/city/art/sources/README.md`).
>
> **What survives, and it is the better half of the idea.** *"Introduces each island's
> local advisor persona"* was reaching for a real thing — that the personas want
> introducing rather than silently swapping. Under eras that becomes an **era-advance
> handover**: the outgoing advisor hands over to the incoming one at the advance, which
> needs no third character and gives the changeover a beat. **PROPOSED, not decided** —
> nothing is implemented, and `D-ERA28` deliberately leaves the handover open.
>
> **Consequence for §6 Q3, which this bullet was written to defer.** *"One guide vs.
> one-per-island"* is **answered**: one advisor per **era**, and the count is ten. The
> per-domain personas already registered here (D1 City Clerk / Deputy Mayor §2.2, D5 Guild
> Master Artificer §4.1.2) are unaffected as *voices* — `D-ERA28` governs the **art**, and
> Gabe's 2026-07-27 annotation above already put the voice in Evan's hands.
>
> **Two other places in this file say the same superseded thing, and are annotated here
> rather than three times over** (this file's convention — cf. Gabe's "read every … in this
> doc as" above). Read both as superseded by this annotation:
>
> - **§1.6.1, Frame C's benefits** — *"gives the CityGuide an obvious reason to travel and
>   narrate."* It no longer needs one; nothing travels.
> - **§1.6.2, the player's role** — *"Your constant companion is the CityGuide (§1.6.4), who
>   sails with you and introduces you to each island's own advisor."* The companion for era
>   one is **Oru**, who belongs to era one and does not sail.
- **The endgame — "Attacks = Calculus I."** The roadmap climax (PRD §16.1,
  `Game_Architecture_Blueprint.md` §8.2) is the arrival the whole voyage prepares
  for: mastered prerequisites defend the finished city, non-punishing and
  architected-only today. The frame makes the endgame the story's natural
  destination rather than an unrelated future mode.

#### 1.6.5 Guardrails for the story layer (skin only — restated)

The narrative sits **on top of** the skin guardrails in §1.4 and adds nothing that
can touch content:

- **Same math, same order, same answers.** The story explains motivation only. It
  never gates a node, reorders a prerequisite edge, changes a quantity, or alters a
  canonical answer / accepted form. A themed-and-narrated NUM.S sum is still `-2`.
- **No story-imposed sequence.** The graph opens **D2, D3, D4, and D10 together** off
  `NUM.4` (§1.5); the "voyage" is a *suggested reading order and a register walk*,
  never an enforced path. The frame must not make D2 "come before" D3, or make any
  island a prerequisite for another that the registry does not.
- **D10 is optional; the story cannot require it.** Nothing anywhere depends on
  Geometry (§1.5), so the muster cannot either. Meridian Point is written as the ally
  who needs no readying precisely so the fiction never implies you *must* go — skip it
  entirely and the ending is unchanged.
- **A far horizon, never a countdown.** The arrival is a calm certainty and a
  **readiness** goal, not an urgency timer, a streak-loss threat, or a shaming
  pressure (`Game_Visual_Design_Brief.md` §2). Storms stay celebrations, not
  gauntlets. If a beat ever reads as "hurry or lose," it is wrong for this audience.
- **Accessible without the story.** Meaning is never carried by the narrative alone:
  a student who ignores every story beat still sees the plain operation, and the full
  loop stays operable from the DOM (§1.4, `Game_Visual_Design_Brief.md` §8).

Open questions this frame raises for the team are collected in **§6 (Q8–Q12)**.

---

## 2. Starter island — D1 "City Work / Civic" (in depth)

### 2.1 Island premise

> **Foundations Isle — "you are the one making the city work."** D1 is the
> founding island of the world: a small civic settlement the student runs. Every
> D1 skill is the everyday math of **building and operating a city** — reading the
> ledger at Town Hall, cataloguing the Library, sequencing a build permit,
> distributing supplies to the school, tallying the park's inventory, and keeping
> the Clock Tower's rates and schedules straight. The island already exists in
> engine as the "starter island" with a harbor, so narratively the student has
> just **landed and been handed the keys to the city**.

This premise is chosen so the **already-civic buildings** (`D1_NODE_BUILDINGS`)
and the lessons finally tell one story. It is Tier-0 / foundational: warm,
concrete, low-stakes, no jargon.

### 2.2 Advisor persona (D1)

*(⚠ Gabe, 2026-07-27: **SETTLED and unchanged.** Under `Content_Authoring_Split.md`
§1.1 this row is **Evan's** to maintain, which is where it already sat. The City
Clerk / Deputy Mayor stands.)*

A **friendly City Clerk / Deputy Mayor** figure — practical, encouraging, "let's
get the paperwork right so we can build." Voice matches the existing advisor
moods (`neutral` / `happy` / `encouraging` in `AdvisorNpc.tsx`). The clerk frames
each lesson as a task the city needs done, and celebrates a finished building as
"another piece of the city up and running." (Advisor **art** is still a
placeholder box — persona here is dialogue/tone only, and is exactly the kind of
per-island voice PRD §1.4 calls for.)

### 2.3 Per-node city-theme framings

The six D1 nodes, their real skill (from `Node_Spine_v4.md` / the packs), the
building each one builds (`D1_NODE_BUILDINGS`), and **2–3 concrete, city-themed
framings** Anthony can author from. Each row ends with a **sample themed CFU
rewrap** that keeps the *existing* pack answer identical — showing that theming
touches only the prompt's story.

| Node | Skill | Building | City-themed framings |
| --- | --- | --- | --- |
| **NUM.S** | Signed-number arithmetic (sign = direction, `\|x\|` = distance; add/sub/mul/div sign rules) | **Town Hall** (civic HQ / tower) | (1) **Floors above/below ground:** ground floor = 0, upper floors positive, basements/sub-levels negative; an elevator ride is a signed sum, `\|floor\|` = distance from the lobby. (2) **Budget surplus/deficit:** monthly revenue (+) vs. spending (−); a running balance is a signed sum; "cancel a debt" = subtract a negative = add its opposite. (3) **Temperature log** across seasons: above/below zero, day-to-day change as a signed difference. |
| **NUM.F** | Fraction arithmetic (equivalent fractions, common denominators, multiply/divide, lowest terms) | **Public Library** (records/archive) | (1) **Dividing land parcels:** a city block split into fractions for housing/park/road — add the shares (common denominator), find what's left, reduce. (2) **Materials & mixes:** take `2/3` of a cement batch, then `3/4` of that (multiply); split a brick load into fractional shares (divide = ×reciprocal). (3) **Archive/catalog shares:** fractions of shelf space or a scaled canteen recipe for city crews. |
| **NUM.2** | Order of operations (fixed tiers, not left-to-right; order changes the result) | **Rowhouse Flats** (residential row) | (1) **Permit / build sequencing:** foundation → framing → roof; a cost formula must be evaluated in the right order (units × rate, *then* add the permit fee). (2) **Rent/utility bill:** base charge + units × per-unit − a bundled discount (parentheses first). (3) **"Order matters" cautionary:** show the same numbers in the wrong order producing a wrong bill for a block of flats. |
| **NUM.3** | Field properties / distributive (commutative, associative, distributive, identity, inverse) | **Community School** | (1) **Rearranging crews/materials:** load supply trucks in any order/grouping — same total (commutative/associative). (2) **Distributing supplies:** give each of 3 classrooms `(x + 4)` items → `3x + 12` (distributive); a bulk order shared evenly. (3) **Identity & inverse:** adding 0 late students changes nothing; "undo" a mis-logged transaction (additive inverse); halve/double a supply order (multiplicative inverse). |
| **NUM.4** | Simplify / combine like terms (like terms add; distribute then combine) | **Central Park** (park/green) | (1) **Tally park inventory:** combine like items across zones — benches with benches, trees with trees; unlike items (`x` vs. `x²`, saplings vs. mature trees) stay separate. (2) **Landscaping budget:** distribute a per-zone cost across identical park zones, then combine totals (distribute → combine). (3) **Planting roster:** sum like plant types across flowerbeds while keeping distinct species apart. |
| **NUM.5** | Ratios, rates, proportions, percents, units | **Clock Tower** (landmark / time) | (1) **Scale models & blueprints:** map scale `1 in : 50 ft`, proportion to a real distance or the tower's true height. (2) **City stats & density:** people per square mile, parks-to-residents ratio, unit rates comparing neighborhoods; bricks laid per hour on the tower (the clock motif → per-time rates). (3) **Budget rates & unit conversions:** sales-tax / budget-allocation percents; convert feet↔miles of road or gallons↔liters of water supply by cancelling units. |

**Sample themed CFU rewraps (answers unchanged — copy-ready pattern):**

- **NUM.S** — pack CFU `Evaluate $-8 + 6$` → **`-2`.** Themed: _"The Town Hall
  elevator starts 8 levels below ground and rises 6 levels. Which floor does it
  reach?"_ → still `-2`.
- **NUM.F** — pack CFU `Multiply, lowest terms: 2/5 × 5/6` → **`1/3`** (reduced).
  Themed: _"`2/5` of a block is zoned housing; `5/6` of that housing is
  townhouses. What fraction of the block is townhouses?"_ → still `1/3`, still
  `reduced_fraction`.
- **NUM.2** — pack CFU `Evaluate $15 - 2 \times 3^2$` → **`-3`.** Themed:
  _"A permit is \$15; the office subtracts a `2×` penalty over `3²` late days.
  What's the balance?"_ → still `-3`.
- **NUM.3** — pack CFU `Expand $3(x+4)$` → **`3x+12`.** Themed: _"The school gives
  each of 3 classrooms a kit of `x` books plus 4 supplies. Total items?"_ →
  still `3x + 12` (same `accepted` forms).
- **NUM.4** — pack CFU `Simplify $-2x + x^2 + 7x$` → **`x^2 + 5x`.** Themed:
  _"A park zone loses `2x` benches, keeps `x²` trees, and gains `7x` benches.
  Simplify the count."_ → still `x^2 + 5x`.
- **NUM.5** — pack CFU `What is 20% of 30?` → **`6`.** Themed: _"Parks get 20% of
  a \$30M city budget. How many \$M is that?"_ → still `6`.

### 2.4 D1 authoring guardrails

- Rewraps must keep the **exact** quantities, `answer_key`, `accepted` list, and
  `representation`/`simplification` of the current pack items (see the frozen
  packs `content/lessons/d1/*.json`). The story changes; the check does not.
- Keep contexts **consistent within a node** (don't mix "floors" and
  "temperature" inside one paragraph) and **plausible for the building** (the
  Library does records, the Clock Tower does time/rates).
- Keep the reading level low and the math visible — a student who ignores the
  flavor must still see the operation.

---

## 3. Framework: a reusable island-theme template

Fill one of these per island so every island is themed the same way. This is the
unit of work for the team; D1 above is the worked example.

```md
### Island: <D#> — <Domain name from skill_graph.json>
- **Theme name:** <short evocative name, e.g. "Foundations Isle / City Work">
- **Narrative premise:** <1–2 sentences: what this island IS in the world, and
  the student's role on it>
- **Tone / register:** <e.g. warm & civic; industrious; coastal & timekeeping>
- **Advisor persona:** <the island's NPC role + voice, matching AdvisorNpc moods>
  *(⚠ Gabe, 2026-07-27: filled in by **Evan**, who owns this line for every island
  — `Content_Authoring_Split.md` §1.1. A lesson author leaves it to him and writes
  a plain unnamed advisor voice until it is filled.)*
- **Visual / building motifs:** <hue family from Game_Visual_Design_Brief §4.1;
  building archetypes; landmark props; anything Evan skins>
- **Example-context palette:** <3–6 reusable real-world contexts the domain's
  word-problems draw from>
- **Per-node framing:** <for EACH node in the domain: node id · skill · building ·
  2–3 concrete themed contexts>  ← the core deliverable
- **Guardrails checked:** answers/forms unchanged · additive to schema ·
  accessible without flavor · frozen assessment items untouched (see §5)
```

**Authoring rules for any island:** (a) theme the *story*, never the numbers or
required form; (b) one coherent motif per island, reused across its nodes; (c)
respect both prerequisite ordering **and the grounded → fantastical arc** (§1.5) —
an early island stays concrete/foundational *and* low-magic, a later island may
lean on richer contexts *and* a more fantastical skin, with **D5 the threshold**
where overt fantasy begins; (d) every themed prompt degrades to a plain, legible
math task **no matter how fantastical the skin** (a dragon can't change that a
NUM.S sum is `-2`).

---

## 4. Proposed themes for the other 9 islands (D2–D10) — PROPOSED / placeholder

Starter map only — names, premises, and node hooks below are **proposals to
refine with the team**, not decisions. Domain names + nodes are read from
`skill_graph.json` / `Node_Spine_v4.md`; the **hue family** is each domain's
already-assigned color from `Game_Visual_Design_Brief.md` §4.1 (a free visual
seed for each island).

The map is ordered to walk the **grounded → fantastical arc** (§1.5): **D2–D4**
stay grounded (a growing frontier town, a live volcano station, and an Age-of-Sail
shipyard — specific, vivid, historical/place-based settings, not abstract admin),
**D5** is the **threshold** into overt fantasy and is worked to authoring depth in
**§4.1** (the
crafting-guild exemplar), and **D6–D9** carry the fantastical register forward.
**D10 Geometry is ordered here by availability, not by its number** — `NUM.4`
opens D2, D3, D4 and D10 together, and nothing depends on Geometry (§1.5), so it
is placed **inside the grounded run, before the D4 hinge**, and written as a
first-wave optional excursion rather than a capstone.
Only the *skin* shifts across the arc — every node hook below still names the
domain's **real skills**, and the hue families are the locked ones from the brief
(D10's is newly proposed here, since the brief has no row for it yet).

| Island | Domain (nodes) | Hue family | PROPOSED theme | One-line premise | Sample node hooks |
| --- | --- | --- | --- | --- | --- |
| **D2** | Exponents & Radicals (EXP.1, RAD.1–4 — **all five buildings decided 2026-07-26: the Boom Hotel (EXP.1), the Kiln Yard (RAD.1), the Railhouse (RAD.2), the Telegraph Office (RAD.3), the Toll Gate (RAD.4), plus the Land Office hub; specified in `2026-07-26-d2-boomtown-square-island-design.md` §2, which is the source of truth. No placeholder remains.**) | Clay | **Boomtown Square** — a frontier town that keeps growing _(grounded / historical)_ **[RENAMED 2026-07-26 by Gabe, PR "D2: plain-language pass"; was "Prospect Gulch — the Boomtown". Evan owns this row: re-word or revert at will, the D2 packs follow this cell.]** | A dusty **frontier town** on red clay that keeps **doubling**: the crowd, the shops, the rows of new buildings. The flavour is deliberately light and the math leads every sentence — powers for anything that grows, **square roots** for any side you back out of a square. Everyday nouns only (a square patch of ground, a wooden beam, a rope), so a remedial learner never has to decode the setting to reach the mathematics. | exponent laws → the crowd or a shop's takings **multiplying** week on week (product / power rules; zero and negative exponents as growth that stops and reverses); roots → back out the side of a **square patch of ground** from its area, or a cube's edge from its volume (square roots / cube roots), and size a wooden beam; fractional exponents ↔ radical form → one power written two ways, as `x^(p/q)` and as a root. |
| **D3** | Linear Equations, Inequalities & Absolute Values (LIN.1, LIN.3–6) | Ochre | **Emberwatch — the Volcano Station** — a volcanologist's outpost on a live volcano _(grounded / place-based)_ | A smoking **volcano island** watched from a cliffside monitoring post: **solve** for the unknown from a rising lava lake, **rearrange** the gauges' formulas, set **safe-zone limits**, and hold every reading **within tolerance** — the threshold math that later returns, re-skinned, as Verdigris Hold's potion-potency ceilings (D5). | solve linear eqn → find the unknown from a linear reading (turns until the lava lake tops the rim; chamber pressure from a gauge); rearrange a formula → re-solve a gas or temperature relation for the variable you need; inequalities/intervals → **evacuation & alert bands** (stay ≥ X back, keep gas ppm ≤ the safe cap) as intervals; absolute value → a sensor **tolerance**, a tremor "within ± of normal", distance from baseline. |
| **D10** | Geometry (GEO.1–2) *(domain added 2026-07-24)* | **Limestone** `#BFB199` *(newly proposed — no row in the brief yet)* | **Meridian Point — the Survey Camp** — a cartographers' and surveyors' station _(grounded / historical — an early, optional excursion; see §1.5)_ | A wind-scoured **headland camp of surveyors and mapmakers**: chains and sighting-staves, cairns and boundary stones, a chalk-lined drafting shed, a small quarry and a stone cistern. This is the island that **measures every other island** — the archipelago's own map is drawn here — which is exactly why nothing else depends on it. You may sail here early, and you may never sail here at all. | **GEO.1** (Pythagoras, similar triangles, angles) → **triangulate across open water** to a rock you cannot walk to; take a sea-stack's height from the **shadow it casts** (similar triangles); read the angle a new road cuts across a boundary line. **GEO.2** (area, perimeter, volume, surface area) → peg out **land parcels** (area + perimeter of the fence); cut a **quarry block** (volume); line a **cistern** (surface area); estimate the fill a causeway will swallow. |
| **D4** | Polynomials & Quadratics (POL.1–8 — **POL.8 added in the 2026-07-24 coverage expansion; its building is a PLACEHOLDER pending Evan**) | Sage-green | **Bowsprit Bay — the Shipwright's Yard** — an Age-of-Sail shipyard _(grounded / historical — the hinge; the last port before the fantastical isles)_ | A weathered **shipbuilding harbor** where **areas** lay out decks and sails and **arcs** rule the launch — a hull's parabola, a signal rocket over the water, a mooring line's sag — and the ship you finish here is the one that carries you across to the enchanted isles. | multiply/factor polynomials → lay a deck or sail as an `a×b` area, or factor a plank's area back into its sides; quadratics → the **parabolic arc** of a ship down the slipway, a launch-day signal rocket, or a taut sail's belly; vertex/min-max → the rocket's apex or the keel's deepest draw; end behavior/zeros → where the arc meets the waterline (roots) and how a hull's curve opens. |
| **D5** | Rational Expressions & Functions (RAT.1–6) | Teal-sage | **Verdigris Hold — the Crafting Guild** — forge + alchemy _(FANTASY — threshold; worked in §4.1)_ | A medieval-fantasy **crafting town** built around a **blacksmith's forge** and an **alchemist's station**, where every skill is the math of mixing, measuring, reducing, and scaling recipes (potions & alloys). | reduce a recipe/alloy to lowest terms, name the **forbidden measure** (excluded value); scale a batch (× / ÷); combine reagents over a **common measure** (+ / −); potency-vs-dilution curve with a **ceiling** (asymptote) & a **cursed dose** (hole / vertical asymptote); solve a mixture / brew-rate equation and **reject the cursed (extraneous) root**. → **see §4.1.** |
| **D6** | Functions & their Graphs (CG.1, FUN.1–10) | Eucalyptus | **The Gearwright's Menagerie** — a workshop of enchanted automata on a survey-grid _(fantasy)_ | A wonder-workshop of **enchanted machines** — clockwork beasts and rune-driven contraptions — each a device that takes one input and returns **one output**, arranged across a surveyed **grid** of the workshop floor. | function notation / vertical-line test → each automaton gives **one output per input** (a sound machine never gives two); domain/range → which tokens a machine will **accept** and which it can **emit**; coordinate plane → the workshop **peg-grid**, distance & midpoint between two mounts; transformations → re-scribing a blueprint (shift / scale / reflect the curve); piecewise → a contraption with several **gear-modes**, a different rule per range. |
| **D7** | Linear Functions (LF.1–4) | Dusty blue | **The Skyway Caravans** — mountain passes & sky-rails between the isles _(fantasy)_ | A high country of **caravan passes and floating-isle rails** where **slope is the grade** of every road and the **rate** of every haul, and two routes meeting is a crossing to bargain at. | slope as rate → the **grade** of a pass or a caravan's speed (rise over run); write/graph a line, parallel & perpendicular → laying straight **rail** (parallel sidings, a perpendicular switch); linear model → a **toll or freight** schedule (flat fee + per-mile); system of two lines → where two routes **cross** (solve the pair). |
| **D8** | Exponential & Logarithmic Functions (EL.1–6) | Muted indigo | **Wyrmvault — the Dragon's Hoard & Star-Spire** — a hoard that compounds, a spire that reads vast scales _(fantasy)_ | A sleeping **dragon's treasure-vault** where the hoard **compounds** on itself and a night-dark **star-spire** reads magnitudes across **vast arcane scales**. | exponential / `e` / compound → a **hoard that doubles** (or a growth-charm) compounding each season; graph exp → a growth or **decay** curve (a fading enchantment); exp ↔ log form & evaluating logs → the spire reading a **great scale** (ward-strength, mana-quake magnitude, astral brightness); log properties → **combining** two scale readings (product → sum); solve exp/log eqns → "**how long** until the ward fades or the hoard doubles". |
| **D9** | Trigonometry (TRG.1–9) | Muted violet | **The Moonwatch Spire — Celestial Tides** — a mystic-astronomer's coast _(fantasy — the peak)_ | A mystic-astronomer's **beacon-spire** on a moonlit coast where **angles and cycles** are celestial magic — sweeping beacons, moon-driven tides, and a clockwork orrery — closing the voyage back to the world's lagoon and D1's Clock Tower. | angles/radians, coterminal → the **sweep** of a beacon or an orrery hand (same heading, another turn); right-triangle trig → measure a **spire's height** or the distance across the strait; unit circle → the **rotating beacon** / constellation wheel; graph sin/cos → the **moon-tide chart** rising and falling; periodicity → the tides and the celestial **day cycle** repeating. |

> **D10 Geometry — themed 2026-07-25 (PROPOSED).** Replaces the earlier
> "no theme decided" placeholder. Three notes on the choices:
>
> - **Placement is graph-driven, not numeric.** `NUM.4` is the shared gateway to
>   D2, D3, D4 *and* D10, so Geometry opens in the **same wave** as the other
>   grounded islands — and nothing depends on it (§1.5). It is therefore ordered in
>   this table **between D3 and D4**, inside the grounded run and ahead of the D4
>   hinge, rather than trailing the fantastical islands. The "camp that maps the
>   archipelago" premise turns that dead-end branch into deliberate narrative
>   rather than an oddity to explain away.
> - **The hue is a proposal and needs adding to the brief.**
>   `Game_Visual_Design_Brief.md` §4.1 has rows for D1–D9 only. **Limestone
>   `#BFB199`** is offered as a warm, desaturated stone (survey markers, chalk
>   lines, quarried block) that sits comfortably beside the grounded islands where
>   D10 actually plays, and stays clearly distinct from terracotta `#C98A5E`, clay
>   `#C9A15E`, and ochre `#B0A45E`, which are all more saturated and more orange.
>   Continuing the warm→cool walk past D9's violet would have handed the *earliest*
>   optional island the *coolest* hue.
> - **Still open:** the two per-node **buildings** and the **advisor persona** are
>   not authored here (Evan owns buildings + hue; Anthony owns advisor voice and
>   word-problem contexts). *(⚠ Gabe, 2026-07-27: the persona is **Evan's** to
>   define, alongside the buildings and hue already his —
>   `Content_Authoring_Split.md` §1.1. D10's lesson author, Anthony per
>   `Content_Authoring_Split.md` §3, keeps the word-problem contexts and authors in
>   whatever voice Evan sets.)* D10 also has **no game descriptor** yet —
>   `NEIGHBORHOOD_DESCRIPTORS` does not include it. Under the new island-decay
>   design it will additionally need its **own Town Hall** building (the survey
>   office is the obvious candidate) — see
>   `2026-07-25-island-decay-and-gold-design.md` §5.1.

### 4.1 Fantasy exemplar — D5 "Verdigris Hold / the Crafting Guild" (worked, PROPOSED)

The one PROPOSED island worked to the same authoring depth as D1 (§2), to (a)
prove the §3 template on a **later, fantastical** island and (b) anchor the
grounded → fantastical arc (§1.5) with a concrete threshold. Everything here is
**PROPOSED** and, like all theming, is **skin-only**: D5's real skills, node IDs,
answers, and prerequisite order are untouched (§1.4).

#### 4.1.1 Island premise

> **Verdigris Hold — "the Guild took you on; now earn your marks."** D5 is the
> **crafting-guild island**: a snug medieval-fantasy town built around two great
> workshops — a **blacksmith's Forge** and an **alchemist's Alchemy Station** —
> with an enchanter's bench in the loft. Every D5 skill is the math of a working
> recipe: **reducing** a formula to its purest ratio, **scaling** a batch up or
> down, **combining** reagents over a common measure, reading a **potency curve**
> with a ceiling it can't cross, and **solving** "how much of this to reach that"
> — then throwing out the **cursed measure** the math allows but the craft
> forbids. The student arrives as a **journeyman crafter** and earns guild marks
> by getting the ratios right so the **alloys hold and the brews don't curdle**.

Why D5 carries the fantasy: rational expressions/functions *are* the math of
**mixtures, concentrations, dilutions, and combined rates** — i.e. **potions and
alloys** — so a forge-and-alchemy town is the domain's most honest skin (far more
than an abstract "add these fractions"). It also sits **mid-archipelago** (Tier 2
in `Node_Spine_v4.md`), exactly where the world should tip from grounded to
fantastical, and it **rhymes with the starter**: D1's apprentice
fractions/ratios (NUM.F, NUM.5) *grow up* into D5's master recipes.

#### 4.1.2 Advisor persona (D5)

*(⚠ Gabe, 2026-07-27: stands as written. Under `Content_Authoring_Split.md` §1.1
this row is **Evan's** — it is his own spec and his own proposal — so confirming
or revising the Guild Master Artificer is his call, not D5's lesson author's.)*

A **Guild Master Artificer** — half blacksmith, half alchemist — a warm, exacting
mentor whose refrain is "get the measure right, *then* we pour." Encouraging, not
stern: a curdled brew or a brittle alloy just "needs re-balancing," never a
failure (matches the `neutral` / `happy` / `encouraging` AdvisorNpc moods and the
non-punishing tone of `Game_Visual_Design_Brief.md` §2). Same advisor-art caveat
as D1: persona here is dialogue/tone; the NPC art slot is Evan's.

#### 4.1.3 Visual / building motifs (Evan)

- **Hue:** the district's locked **Teal-sage `#6FA091`** (brief §4.1), read as
  **verdigris** — the teal-green patina on aged copper/bronze. That one reading
  ties the *already-assigned* hue to **both** crafts (oxidized metal at the forge,
  green reagents at the still) and names the town. Buildings render **in-family**
  (verdigris body + accent), no engine change (brief §4.1/§4.3).
- **Forge motifs:** anvil, bellows, glowing coals, quench trough, stacked ingots,
  tongs; forge-sparks as the only warm accent against the cool verdigris.
- **Alchemy motifs:** bubbling retorts and a glowing green vat, a **balance
  scale**, graduated vials/measures, mortar & pestle, drying herbs.
- **Enchantment motifs:** rune-etched tools, faint glowing sigils, small crystals
  — used sparingly (the enchanter's loft, not the whole town).
- **Buildings are PROPOSED** — unlike D1 there is **no** locked `D5_NODE_BUILDINGS`
  yet. The names below are display strings in D1's style; the silhouette /
  answer-type archetype rule (hall/tower/workshop/block, brief §4.3) should be
  applied once D5's per-node item answer-types are set.

#### 4.1.4 Per-node crafting framings

The six D5 nodes (skill from `Node_Spine_v4.md`), a **PROPOSED** guild building,
and **2–3 concrete fantasy framings** Anthony can author from — each mapped to the
node's *real* skill so the craft never distorts the math.

| Node | Skill | Building (PROPOSED) | Crafting-theme framings |
| --- | --- | --- | --- |
| **RAT.1** | Simplify rational expressions; factor, reduce, **track excluded values** | **The Reducing Bench** (apothecary's reduction table) | (1) **Purest recipe:** factor & cancel a written recipe to its lowest-terms ratio; the canceled factor is a **forbidden measure** (a dose that would spoil the brew — e.g. "0 base essence"), stated as the excluded value. (2) **Alloy purity in lowest terms:** parts-metal / parts-total reduced to its canonical ratio; the denominator's forbidden value = "an alloy can't be 0 total." (3) **Rune-charge** reduced to its canonical sigil; the excluded charge = the one that cracks the rune. |
| **RAT.2** | Multiply & divide rational expressions | **The Scaling Table** (batch-sizing) | (1) **Scale a batch:** multiply the recipe by a batch factor (double the cauldron); **divide** to split one brew into vials (× reciprocal). (2) **Measure-conversion charm:** multiply by a unit-ratio (drams per vial); like factors cancel like reagents. (3) **Forge:** scale an alloy recipe from a dagger up to a greatsword; divide one bar into equal billets. |
| **RAT.3** | Add & subtract rational expressions (common denominator) | **The Blending Vat** | (1) **Common measure (LCD):** two ladles pour differently-sized fractions of a cask into one vat — re-express over a common measure before adding; skim a share off = **subtract**. (2) Two reagent streams, each a fraction of a *different* cask → common denominator to total the pour. (3) **Forge:** combine flux from two differently-sized scoops; net carbon after burning off a fraction (subtract). |
| **RAT.4** | Simplify **complex / nested** rational expressions _(low item weight — screening)_ | **The Master-Recipe Board** | (1) **Recipe within a recipe:** a reagent that is itself a mixture → a fraction whose parts are fractions; clear the inner measures to simplify. (2) An enchantment fed by another enchantment's output → a nested ratio; simplify the stacked formula. |
| **RAT.5** | Graph & analyze rational functions: domain, intercepts, **holes**, **vertical & end-behavior asymptotes** | **The Assay Spire / Potency Gauge** | (1) **Potency vs. dilution:** as solvent is added, potency falls toward but never reaches a **floor** (end-behavior asymptote = the brew's irreducible base strength). (2) A dilution that would shatter the vial is a **vertical asymptote** (forbidden dose); a **hole** = a single "dead measure" where the recipe cancels (defined everywhere but that cursed dose). (3) **Enchantment resonance** vs. rune-charge approaches a **ceiling** it can't exceed — the fantasy "spell-cost ceiling." (True threshold *inequalities* live on **D3 / Emberwatch**'s safe-zone limits; here the cap is an **asymptote**.) |
| **RAT.6** | Solve rational equations; **reject extraneous solutions** | **The Proving Cauldron** | (1) **Mixture to target:** "how many drams of pure silver raise this alloy to 80% purity?" → set up & solve a rational equation. (2) **Combined craft-rate:** "the smith fills the quench trough in 6 turns, the apprentice in 9 — together?" → the classic together-rate equation. (3) **Reject the cursed root:** the algebra yields two doses but one is a **forbidden/impossible measure** (a negative volume, or a dose that hits an excluded value) — discard the cursed root, keep the real one. |

**Illustrative CFU rewraps** (D5 packs are **post-MVP**, so — unlike §2.3's real
D1 pack items — these are *pattern demos* on standard items; the point is the
**answer / required form is unchanged** by the skin):

- **RAT.1** — `Simplify (x²−9)/(x²−x−6); state excluded values` → **`(x+3)/(x+2)`,
  `x ≠ 3, −2`.** Themed: _"Reduce the elixir recipe `(x²−9)/(x²−x−6)` to its
  purest ratio and name the two **forbidden doses**."_ → still `(x+3)/(x+2)`,
  `x ≠ 3, −2`.
- **RAT.3** — `Add 1/x + 1/(x+2)` → **`(2x+2)/(x²+2x)`.** Themed: _"Two ladles pour
  `1/x` and `1/(x+2)` of a cask into the vat. What's the total pour?"_ → still
  `(2x+2)/(x²+2x)`.
- **RAT.6 (combined rate)** — `Together-time: 1/6 + 1/9 = 1/t` → **`t = 18/5`
  (3.6).** Themed: _"The smith quenches a trough in 6 turns, the apprentice in 9.
  Working together, how many turns?"_ → still `18/5` turns.
- **RAT.6 (extraneous)** — a solve yielding `x = 4` and `x = −1`, where `x = −1`
  hits an excluded value → **`x = 4`.** Themed: _"The brew-balance gives two
  doses; one is a **cursed measure** the cauldron rejects. Which dose holds?"_ →
  still `x = 4`.

#### 4.1.5 D5 authoring guardrails

- Same as D1 (§2.4): the **story** changes, the **check** does not — quantities,
  `answer_key`, `accepted` forms, and `representation`/`simplification` stay
  identical once D5 items are authored/frozen (`packages/item-bank`, §5).
- **One craft per node:** don't mix "potion" and "alloy" *inside a single
  paragraph*; pick the framing that fits the building (the Blending Vat blends,
  the Proving Cauldron proves).
- **Excluded values / extraneous roots are load-bearing math, not flavor** — the
  "forbidden/cursed measure" skin must never hide that a value is excluded; the
  student must still see *which* value and *why* (brief §8 accessibility).
- Keep the reading level low and the operation visible: a student who ignores
  every rune and potion must still see "factor, cancel, state the restriction."

---

## 5. Ownership & handoff

> **⚠ Annotation — Gabe, 2026-07-27 (FINAL).** The advisor **persona and voice**
> are not Anthony's for any island: they are **Evan's**, for all of them
> (`docs/Content_Authoring_Split.md` §1.1). In the two bullets below, read "advisor
> dialogue" as belonging to **Evan**. Anthony's bullet is otherwise correct — he
> still owns the narrative rewrap, the word-problem contexts and the CFU prose for
> the domains he authors; he simply writes them in the voice Evan sets. Evan's
> bullet grows rather than shrinks: the NPC **art** slot, the island world,
> buildings and hue were already his, and the **voice** now joins them. The
> skin-only split in §1.4 is untouched. *(This replaces a 2026-07-26 annotation
> that routed the voice to the domain's lesson author; that rule is reversed, and
> the history is recorded once in `Content_Authoring_Split.md` §1.1.)*

**Anthony (lessons / content — `engines/lesson`, `content/lessons/d1/*.json`,
`packages/item-bank`):**
- Owns the **narrative rewrap** of `mini_lesson` prose, advisor dialogue, and
  `cfu.prompt` / `cfu.hint` for D1 using the §2.3 framings; keeps every answer
  key/accepted form/representation identical (§2.4).
- Owns themed **word-problem contexts** in new practice/assessment authoring.
  **Critical:** practice/assessment items are **parameterized templates that
  compute the key by real arithmetic** and are then **frozen with an immutability
  snapshot** (`content/items/d1/README.md`, `packages/item-bank`). So:
  - Teaching prose + CFU (teaching-only, no scoring) can be re-themed freely.
  - Re-wording an **already-frozen** practice/assessment prompt changes its hash
    and **must be a deliberate, explicit re-freeze** — prefer theming via the
    template's prompt text at authoring time so keys/coverage are unaffected.
- Owns filling the §3 template for later islands as their content lands — with
  **§2.3 (D1, grounded)** and **§4.1 (D5, the fantasy crafting guild)** as the two
  worked references bracketing the grounded → fantastical arc.

**Evan (game / city visuals — `engines/game`, `apps/web` city surface):**
- Owns the **island world** presentation: the archipelago framing, per-island
  hue families (§4), building/landmark motifs, and the already-civic
  `D1_NODE_BUILDINGS` names/models.
- Owns themed **visuals/skins** for diagrams and the advisor NPC art slot (the
  advisor is still a placeholder box; persona/tone is Anthony's dialogue, art is
  Evan's). *(⚠ Gabe, 2026-07-27: "persona/tone is Anthony's dialogue" now reads
  "persona/tone is **Evan's**". **Art stays Evan's too** — so both halves of this
  particular split are now his, and the lesson author writes dialogue in the voice
  he sets.)*
- Ensures theming never breaks the accessibility/DOM-mirror rules or the
  construction-state derivation in `D1_City_Builder_Design_Spec.md`.

**Cross-lane notes:**
- **Additive only.** No change to `skill_graph.json`, `shared-state-schema`, or
  the lesson-content schema (Gabe's frozen areas; all-hands to change — not
  needed). Theming is presentation.
- **Math is invariant.** Mastery, checker semantics, difficulty tiers, and
  placement are untouched; a themed lesson grades exactly like the plain one.
- **Consistency contract.** D1's theme is the reference; other islands follow the
  §3 template so voice/motif stay coherent across the archipelago.

---

## 6. Open questions (for the team)

> **⚠ Annotation — Evan, 2026-07-28: Q3 is ANSWERED, Q11 is answered with it, and Q12's
> parenthetical is now factually false.** *(Questions kept as written, per this file's
> convention; the numbering is never reused.)*
>
> - **Q3 — "advisor per island vs. one guide": ANSWERED as one advisor per ERA, so ten.**
>   `D-ERA28` makes the advisor per-era art. Not "a single travelling advisor who changes
>   tone", which is the option that is now closed — see the annotation at §1.6.4.
> - **Q11 — "whose voice narrates": answered by the same ruling.** The travelling-CityGuide
>   option is closed with it. Era one's advisor is **Oru**. Note the *voice* is separately
>   Evan's for every era already (Gabe's annotation at §5), so Q11 has nothing left open.
> - **Q12 — the reel no longer runs a CityGuide-narrated script.** As of 2026-07-28 the
>   first-run demo reel is narrated by **Oru** (`city/onboarding/DemoReel.tsx`), including
>   the unlock beat, which used the guide's `cheer` pose and now uses Oru's `point`. The
>   question Q12 actually asks — explicit beats versus ambient — is **still open**; only
>   its example is stale.

1. **Island vs. neighborhood naming** — do we surface the word "island" to
   students, or keep "district/neighborhood" in UI and use "island" only in
   world/narrative? (Engine already says "starter island.")
2. **How heavy is the theme?** Every prompt themed, or a themed intro + advisor
   narration with a mix of themed and plain drill items (to avoid cognitive load
   for the anxious learner)?
3. **Advisor per island vs. one guide** — one advisor persona per island (PRD
   §1.4) or a single traveling advisor who changes tone per island?
4. **Retro-theming the frozen D1 assessment items** — worth an explicit re-freeze
   to theme the pre/post items, or keep assessment items plain and theme only
   teaching + practice? (Assessment wording feeds the marketed pre/post metric.)
5. **D2–D9 themes & the fantasy arc** — confirm/replace the §4 proposals and the
   **grounded → fantastical arc** (§1.5): is **D5** the right **threshold**, or
   should overt fantasy start later (e.g. D6) or earlier (fold in D4)? Is the
   **Verdigris Hold** crafting-guild skin (§4.1) the one we want for D5, over its
   prior grounded "Waterworks" skin? Some domains still have two plausible skins
   (e.g. **D4** the shipwright's yard vs. a coastal gun-battery fort; **D6** the
   automaton menagerie vs. a cartographer's survey office). The grounded islands
   (D2–D4) were re-cast as **specific, vivid, historical/place-based** settings —
   a frontier boomtown, a live volcano, an Age-of-Sail shipyard — after learner
   feedback that abstract/administrative skins read as too dry; flag any island
   that still feels abstract.
6. **Visual scope** — which themed diagram/building skins are MVP-worthy vs.
   post-MVP polish, given D1 is the only built island at MVP?
7. **How fantastical, how fast?** — the arc is a *register* shift (§1.5), but how
   heavy should the later-island fantasy be for an anxious learner: a light
   storybook wink, or full arcane immersion? (Same spirit as Q2, applied to the
   fantasy skin.)
8. **Named threat vs. implicit dread (the narrative throughline, §1.6)** — is
   naming the antagonist ("Calculus is coming") right for an anxious learner, or
   should the arrival stay unnamed/ambient until the endgame is actually built?
   (Frame C's tone cost; `Game_Visual_Design_Brief.md` §2 bans urgency/threat.)
9. **Does the frame over-promise?** At MVP only D1 is built and the arrival is
   roadmap-only (`Game_Architecture_Blueprint.md` §6, §8.2). Ship the "readying for
   what's coming" premise now, or wait until more of the chain (and the endgame)
   exists, so the story isn't a promise the product can't yet keep?
10. **How much throughline at the cold start?** D1 is meant to be a calm, safe home
    (§2.1); Frame C introduces "something is coming" right after it. How much of the
    stakes belongs at the very beginning vs. held until the shipyard crossing (D4)?
11. **Whose voice narrates?** One travelling CityGuide + per-island advisors (the
    §1.6.4 bridge), a single voice throughout, or fully per-island personas?
    Resolves alongside Q3.
12. **Where does the story surface?** Explicit intro/onboarding beats (the demo reel
    already runs a CityGuide-narrated script) or ambient only (advisor lines + island
    framings)? And how heavy per island — a wink or a full arc? (Ties to Q2, Q7.)
