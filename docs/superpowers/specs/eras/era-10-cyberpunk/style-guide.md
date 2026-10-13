# Era 10 — Cyberpunk Era: style guide (skill buildings)

**Status: PROPOSED.** The era's visual language is authored below — materials, structure, ornament,
the seven masses with the run's seven chains closed, the construction stages and the
props kit. **One thing stays open** as of 2026-07-29: how emissive surface behaves under a single
key light, which is a looks question at a specific zoom and the harder version of era nine's. The
era's road design and **O-14** are closed at the end.

**Scope: the SKILL buildings.** The bought buildings are in `civic-buildings.md`.

> ## ⚑ 2026-07-29 — THIS GUIDE NO LONGER RE-DRESSES ANYTHING BUT THE TOWN HALL
>
> **Team lead, verbatim:** *"on the building upgrades, we think that everything should stay the
> same because of the art overhead, with the exception of the town hall, which should retheme."*
> This **overturns a decided item** (D-ERA8's *"Upgrading changes only the look"*); the amendment
> is at `../../2026-07-27-era-progression-design.md` §6.1, and `../README.md`'s head banner has
> the folder-wide consequences.
>
> **What this guide still OWES, and it is most of it:**
>
> - **Its own 9 new nodes' buildings**, on six masses, and this is now the guide's main deliverable.
>   **A building drawn here has that look for the rest of the run** — nothing gets a second pass,
>   where before a weak drawing was replaced at the next advance. **Three pairs share a mass — `TRG.3`/`TRG.8` on `hall`, `TRG.2`/`TRG.7` on `workshop`, `TRG.4`/`TRG.6` on `tower`** — so each pair needs separating by plan, scale or props, never by geometry (`../README.md`).
> - **The TOWN HALL for this era.** After the ruling the hall is the *only* thing in the city that
>   rethemes, so every guide still owes its own.
> - **The island, the roads and the advisor** (D-ERA26 / D-ERA30 / D-ERA28). The ruling's words are
>   *"on the building upgrades"*; these three are separate decided items and are untouched by it.
>
> **What becomes REFERENCE rather than a deliverable:** everything in this guide about **re-dressing
> the masses it inherits** from earlier eras, and the forward chains through them. It will not be
> built. **It is kept in full and not cut**, because it is still the clearest available statement of
> what each mass *is* as a shape, which whoever draws this era's own new buildings needs.
>
> **Two further rulings the same day.** A building's **shape carries no mathematical meaning** —
> *"i don't think it should"* — so no mass assignment in this guide should be read as saying
> anything about its lesson (era design §6.1). And **there is no generation economy**, so no
> building here produces anything; see `civic-buildings.md` §0.

**Era id:** `cyberpunk` · **Domain:** **D10** Trigonometry after the renumber (**D9** today) ·
**New nodes:** 9 · **Buildings standing by the end of this era:** 62 — **the whole city** · **Era multiplier:** ×512

**Why this era, per `../../2026-07-27-era-progression-design.md` §3:** *Waves, signals,
rotation, rendering.*

---

## Notes before authoring

**Its domain id moves under the renumber**, from D9 today to D10. Node ids do not change
(D-ERA4).

**This is the final era. 62 buildings stand by the end of it, and this guide draws NINE of them.**
Its nine, plus the Town Hall.

> **CORRECTED 2026-07-29 by the re-dressing ruling** (head banner). This read: *"This is the final
> era, so it dresses the whole city — all 62 skill buildings. It is also, per §12, the cheapest
> guide in one specific sense: 'a Cyberpunk building is drawn once and barely needs a through-line
> at all,' because nothing comes after it to re-dress. The through-line work was front-loaded into
> era one."*
>
> **The first sentence was the folder's largest overstatement of a guide's job** and is corrected
> above. **The second is now true of every era, not just this one** — every building in the game is
> drawn once, so era ten's old privilege is the general rule and this guide is no longer
> distinctively cheap. Era ten keeps one real distinction: it is the **last** era, so nothing it
> draws has to leave room for anything after it.

**Three era-ten specific constraints:**

1. **This is the worst case for the road depth guard.** Largest island plus the era most likely
   to want lit, layered road markings. §5.1's rule is sized against exactly this era: whenever
   an era's road has more than one stacked surface, those surfaces must stay resolvable at the
   largest island the game will ever show. **If any era's roads must be single-surface with
   markings baked into the texture, it is this one.**
2. **Emitted light fights the lighting model.** `../../City_Art_Bible.md` §2 specifies one soft
   key light and three face tones per hue, with no runtime lights. Neon is the era's signature
   and it has to be expressed as *emissive surface* within that model, not as lights added to
   the scene.
3. **Mastery gold `#FFB703` is reserved** and a neon palette will want to reach for it. It
   cannot: gold is the mastery accent, carried on the **stars** above a topped-out building and
   on UI accents. **A building body is never gold, in any era** — so an emissive gold sign or
   trim is out as well, because the reservation is about the hue rather than about the surface.

**O-14 is SETTLED — 2026-07-29: NO.** *Whether the unbuilt "calculus attack" endgame becomes the
final era's trial* is answered no: **era ten's trial is the end-of-era trial, exactly like the other
nine** (D-ERA16). §17 dated it *"not blocking; decide before era ten is authored"*, and the seam is
still `ENDGAME_ATTACK_SCENE` with `built: false` as a literal. **Answering it needed no decision
about whether the attack ever ships:** it asks only whether the attack *replaces* the trial, so no
leaves the mode's fate untouched, and if it is built it is a **coda after era ten** on the vent and
the deck. Full statement in the closure block at the end.

---

## 1. The era in one line, and its signature move

**One line:** a lit deck built on top of everything that came before, with nothing removed.

**The signature move — the emissive edge, and retrofit as a way of building.** Light is used as
*trim*: a line along a parapet, a strip under a soffit, a glowing reveal round a window, a lit
seam where two panels meet. It is not there to illuminate anything, and that is what makes it
ornament rather than lighting. The second half of the move is structural: era ten does not build
on cleared ground, it builds **on and around what is already standing**, so a new frame straddles
an older roof and a deck runs over an older street. Both halves suit this era because it is the
first one with nowhere left to go — the island is full, so the only directions available are up,
over, and onto the existing fabric, and the only surface left unused is the surface of light.

**The tally descendant: the animated display.** Era one predicted the motif as far as *a display
panel*, which arrived on schedule in era nine. Era ten takes the one step past the prediction: the
count now moves. A scrolling figure, a bar that climbs and resets, a panel cycling through
numbers. That is the right place for the last era to go, and it is where the motif stops — there
is no era eleven to carry it further. Per D-ERA8 it stays era ornament: an animated display is on
buildings everywhere in this town, and it never displays a building's own lesson.

---

## 2. Materials

Four, and the fourth one has never been available before.

| Material | Read | Notes for modelling |
| --- | --- | --- |
| **Dark composite panel** | The body material. Near-black, matte, seamed | Rainscreen panels with an expressed joint and visible fixings — the opposite of era nine's flush skin. The seams are meant to be counted |
| **Dark and switchable glass** | Deep, mirror-like, occasionally clouded | Tinted almost to opacity, so glazing reads as a darker panel with a sheen rather than as a hole. Switchable panes give one or two lighter patches per elevation, and they should look deliberate |
| **Exposed conduit, cable tray and ducting** | Linear, busy, added-on | Run openly across faces, round corners, up parapets, bracketed off the panel. This is the era's texture, and it wants to look accumulated rather than designed |
| **Emissive signage** | The only bright thing in the era | A material, not a fitting: lit letters, lit bands, lit edges, treated as surface within `../../City_Art_Bible.md` §2's model. **Era ten's fourth material is the first in the run that emits rather than reflects**, which is exactly what makes it dangerous — see constraint 2 above, and constraint 3 for what colour it may be |

**Nothing is being withheld, because there is no era eleven.** So this paragraph becomes the
closing ledger instead: **what has gone from the island for good, and the era that last had it.**
Thatch, last used in era two. The timber frame on the outside of a wall, era five. Lime mortar and
dressed ashlar as a wall rather than as a facing, era six. Brick as mass and cast iron, era seven.
Soil as the walking surface, era eight. And daylight as the only light source, era nine.

**What stops that reading as loss is that era ten keeps a findable fragment of the early island on
purpose.** The island section below names three: a stretch of Bronze Age or Classical masonry left
in the new sea face, one small patch of raw rock and gravel beach preserved behind a barrier, and
the Renaissance balustrade reused as a handrail. Nothing has been demolished; it has been built
over, and the difference is the whole closing statement of the ten-era material arc. Every
material the island ever used is still somewhere on it, and none of them is doing its old job.

---

## 3. Structural language

**Buildings stand on other buildings.** The frame is still a frame, but it lands on a deck, on a
podium, or on the roof of something older, and the joint between the new and the kept is expressed
rather than concealed. The vocabulary is:

- **The deck and the layer.** The walking surface is carried above the old ground, so most
  buildings have two or three plausible ground floors and no single base.
- **Retrofit.** A new structure straddling older fabric, with the older fabric visible through
  and under it — a mast on an existing roof, a deck through an existing hall.
- **The rack.** A structural frame holding units that are clearly separate from it: capsules,
  plant, containers. The frame is the architecture and the modules are the infill.
- **Expressed services.** Cable trays, risers, ducts and vents on the outside of the wall, which
  is era nine's rule inverted on purpose.
- **The cantilever over the void**, out over water or over the older street, so an edge is an
  overhang and a rail rather than a wall meeting ground.
- **Lit soffits and gratings**, because in a layered town the underside of things is as visible as
  the top.

**Heights are stated as an order, and this guide deliberately gives no world-unit targets.**
Every stage is contain-fit to its plot by **one uniform scale**, so the same model stands at two
different heights on two different plots and a number is not something the person authoring one
can aim at. The **ranking** is what an era owes, and it survives re-authoring.

**This era's order, tallest first:** the comms tower, and it is the only thing in the whole run
authored to brush the **24-unit ceiling** — a hard cap rather than a preference, because anything
taller is silently squashed (constraint 2 above), so it is spent once, here, deliberately, and
nothing else in ten eras comes near it. Then the capsule stack, close behind; then the second,
slimmer mast on its retrofitted roof; then the interchange hall and the plant stack, level with
one another; then the data store and the signal lab; and the dish yard lowest. **The hall finishes
the run outside the top two**, where it began the run at the top of it, which is the clearest
single thing the ten-era ranking says.

**One thing about the floor is worth stating even without numbers.** The walking surface is now a
**deck carried over the old island**, so every building starts from a base that is itself above
the original ground — the whole town has been lifted without any single building growing. **The
yard still does not rise relative to what it stands on**, which after ten eras is the most
disciplined thing in the run.

**Aspect ratio is where the run's extremes finish, and it belongs to the models rather than to the
plots.** The mast should be authored many times taller than it is wide, the most extreme
proportion the game will ever show, and a contain-fit preserves that proportion on any plot — so
the proportion is the whole of what makes it the tallest thing in the city. That is the last word
on era one's observation that a settlement's tallest thing is its most slender one.

> **AMENDED 2026-08-01 — the `dwelling` plot was re-authored and THE RANKING DID NOT MOVE WITH
> IT.** The paragraph above puts **the capsule stack second, close behind the comms tower**.
> `TRG.9` is now the **Quantum Core** (§5's `dwelling` entry, re-authored 2026-07-30), and §5
> already records the loss in the past tense — *"the second place in §3's height ranking (an
> isolation hall is low and broad, where the capsule stack **was** second only to the comms
> tower)"* — while this section was never updated, so the two paragraphs have been disagreeing
> since. **This is the amendment, stated as positions rather than as a rewrite**, following the
> convention `../era-09-information/style-guide.md` §3 uses for exactly this hazard:
>
> - **The Quantum Core does not keep second place, and nothing is promoted into it by default.**
>   An isolation hall authored *"wider and deeper than it is tall"* is the least slender roofed
>   thing the era draws.
> - **It sits with the data store and the signal lab, above only the dish yard** — which is worth
>   asserting rather than assuming, because the building stands clear of the deck on isolator
>   mounts and carries a field of finned units across its roof, and neither lifts it. The reason
>   is the mechanical one era nine's §3 banner sets out: a contain-fit scales by the **binding
>   ground span**, so a model authored broader than it is tall is scaled down whole. **Plan span
>   is what holds this position, not what stands on the roof.**
> - **Second place therefore passes to the slimmer mast on its retrofitted roof**, and everything
>   below it keeps its order: the interchange hall and the plant stack level with one another,
>   then the data store, the signal lab and the Quantum Core, then the dish yard lowest.
> - **What the paragraph above still says correctly, and it is the load-bearing part:** the comms
>   tower alone approaches the 24-unit ceiling and nothing else in ten eras comes near it, and
>   **the hall finishes the run outside the top two.** Both survive this amendment — the hall is
>   further from the top than before, not nearer.
>
> **The capsule form is not lost from the era, it is bought rather than earned:**
> `civic-buildings.md` authors the livability row as a rack of stacked lit modules at 1×1, which
> is not a skill plot and does not enter this ranking.

---

## 4. Ornament and visible technology

**Ornament level: high, for the first time since the Renaissance — but none of it is architecture.**
Signage, light and services do all of it. A face is patterned by cable trays and panel seams,
punctuated by lit letters and topped by an animated display, while the massing underneath is as
plain as era eight's: **an ordinary dark box with an extraordinary amount attached to it.**

**Signage is the era's entire identification system, and it is stacked.** Plates, boxes, projecting
blades and lit bands accumulate on one frontage at several sizes and several ages, some dead, some
flickering. Old signs are not removed when new ones arrive — the stack is a history, which is the
habit the era also applies to buildings.

**Visible technology, which after era nine's silence returns in full:** steerable dishes, the mast
and its hazard beacon, camera and sensor clusters, drone docks, steam vents and gratings, external
conduit, roof test rigs, ducting, and the plant stack of the vent itself. **Era nine buried its
machinery and era ten wears it**, and the pair reads as a single argument across two eras.

*(**Steerable dishes are era-ten world vocabulary and no longer a building era ten draws**, as of
`TRG.1`'s 2026-07-30 re-author: the only plot that carried dishes on the ground was the `yard`, and
it is now the Neon Plaza with nothing standing on it. The chain's pad still authors them as shape
language and is never built. **Do not put one back on the plaza** — it is the prop that would undo
the re-author. The era's aerials live on `TRG.4`'s and `TRG.6`'s masts as drum antennas and on Drone
Command's corner mast as sensor and antenna clusters.)*

**Where D-ERA8 bites hardest in the whole run.** Waves and rotation are this era's mathematical
read, and a sine wave along a parapet or a rippling façade is the single most tempting rebus
anywhere in the ten eras — it would look *good*, which is what makes it dangerous. It is still
forbidden. A lit band along a parapet is era trim; a lit band that undulates is a graph. The
distinction is thin and it has to be held anyway.

---

## The skill buildings this era introduces

**AUTHORED, and unchanged by the curation.** These are the curated sets from `ERA_SEQUENCE` in
`packages/skill-graph/src/eras.ts`, which **answered O-1 in PR #180 (merged 2026-07-28)**. This
era's roster came through the curation **exactly as the strict one-domain mapping had it**, so
nothing here moved. Titles verbatim from `../../../../Node_Spine_v4.md`.

**Nine new nodes, and with them the city reaches all 62.**

| Node | Lesson | Mass | What it is in this era |
| --- | --- | --- | --- |
| TRG.1 | Measure angles; convert degrees↔radians; coterminal angles | `yard` | The **Neon Plaza**: an open square of unfenced deck with nothing standing on it, its whole content a two-riser terrace, a long bench-step and a cantilevered lip over the void, every one of those edges carrying an emissive line in its nosing, and people on it |
| TRG.2 | Right-triangle trig; 30/45/60 values; cofunctions | `workshop` | Drone Command: a hardened blast-walled control block with no public entrance, one canted operations gallery of dark glass, and a flat launch-and-recovery deck of landing cradles and racked drones on its roof |
| TRG.3 | Unit circle & reference angles for sine/cosine | `hall` | A broadcast hall: a wide clad shed with a glazed control gallery along one face |
| TRG.4 | All six functions; even/odd; fundamental identities | `tower` | A comms tower, lattice mast rising from a clad equipment podium, drum antennas at two levels |
| TRG.5 | Graph sine & cosine (amplitude, period, phase shift) | `store` | A data store: a blank monolith with a louvred plant band, no windows at all and no signage either, one service door and a hazard plate |
| TRG.6 | Graph tangent & reciprocal trig functions (period, asymptotes) | `tower` | A second, slimmer mast on a retrofitted older roof, guyed, with a lit hazard beacon |
| TRG.7 | Evaluate and compose inverse trig functions | `workshop` | A test annexe: one storey of dark glass on a bracketed frame straddling an older roof, an open rooftop antenna deck, no display anywhere on it |
| TRG.8 | Solve **basic** trig equations over an interval (unit-circle values, inverses, simple algebraic/quadratic-by-substitution forms) | `hall` | An exchange hall: one deep trading floor, new-built on the deck and cantilevered out over the older street below, the body in seamed dark composite panel with its fixings left visible; a lit reveal runs the whole length of the soffit under the overhang, bracketed cable risers climb the elevation in the open, and an animated board of moving figures faces the deck |
| TRG.9 | Core trig identities: sum/difference & double-angle (verify/simplify/apply) | `dwelling` | The Quantum Core: a low broad sealed isolation hall standing clear of the deck on visible anti-vibration bearings, its cryogenic plant bracketed outside and a field of heat-rejection units across the roof |

> ## ⚡ SEVEN RENAMES AND TWO FORM CHANGES — the consolidated pass, and era ten carries the most of any era
>
> **All nine are the lead's, plus two civic renames in `civic-buildings.md`.**
> `output/imagegen/era-10-cyberpunk-building-briefs/README.md` was written against every one of them as
> **PENDING, NOT MERGED**, and **both form changes are quoted from that brief rather than re-invented**
> — it authored them first and this guide adopts its reading.
>
> | Node / role | Mass | Was | Is | Kind |
> | --- | --- | --- | --- | --- |
> | `TRG.1` | `yard` | the Deck | **the Neon Plaza** | rename — **and since 2026-07-30 a form change too** |
> | `TRG.2` | `workshop` | the Chip Plant | **Drone Command** | **form change — defence lineage** |
> | `TRG.3` | `hall` | the Broadcast Studio | **the Hologram Theatre** | rename |
> | `TRG.4` | `tower` | the Mast | **the Signal Tower** | rename |
> | `TRG.5` | `store` | the Vault | **the Data Vault** | rename |
> | `TRG.6` | `tower` | the Rooftop Mast | **the Broadcast Tower** | rename |
> | `TRG.7` | `workshop` | the Rooftop Lab | **the Robotics Lab** | rename |
> | `TRG.9` | `dwelling` | the Module Stack | **the Quantum Core** | **form change** |
> | civic, livability | — | The Capsule Homes | **The Pod Apartments** | rename |
> | civic, blend | — | The Reservoir | **The Nightclub** | **the BUILDING changes** |
>
> **`TRG.8` (the Stock Exchange) and the hub (the Steam Vent) do not move.**
>
> **Every one of era ten's nine nodes resolves to `DEFAULT_FOOTPRINT`, 2×2** — this era deliberately
> closed no footprint block — so neither form change has a plot to move. The method is era two's
> `yard` precedent, which the brief states as an order: **establish the mass and the frozen footprint
> first, then author the new form inside that plot.**
>
> **`"Dwellings, the Quantum Core"` is ACCEPTED and is not to be flagged or substituted.** A dressing
> name may disagree with its mass handle; the lead was shown this announced name, and era eight's
> `"Store, the Radio Workshop"`, and accepted both. **Era ten therefore draws no skill housing at
> all**, which §5's `dwelling` entry states plainly along with what it costs.
>
> **`Drone Command` is the only subtitle in the run with no leading article.** The one-namespace check
> strips a leading *the* before comparing, so this affects nothing mechanically. It is a register
> difference an artist may notice and **should not try to correct.**
>
> **Two things the brief reported and this guide records rather than fixes.** *Signal Tower* and
> *Broadcast Tower* both repeat the mass handle back at the learner — *"Tower, the Signal Tower"* —
> which is the defect era eight's hub was renamed for; and *Theatre* is British against the American
> stable name *Civic Center*, the same inconsistency era nine logged for *Data Centre*. **Both are
> settled names.** Neither changes how anything is drawn.

**Note the domain id moves under the renumber**, from D9 today to D10 (D-ERA4). **Node ids do not
change.**

**Already standing from earlier eras: 53**, each keeping its own era's look, so **62 buildings stand
by the end of the run and this guide draws NINE of them.**

> *(This figure was headed **"Re-dressed from earlier eras"** until the 2026-07-29
> re-dressing ruling. Those buildings are not re-dressed; the count is kept because it is a
> true statement about how much city stands here, and is cited from `../README.md`'s table.)*

*(The heading read "Re-dressed from earlier eras: 53 — so this guide dresses the entire city, all
62", which is the single largest overstatement the ruling corrects in this folder.)* It is also,
per §12, the *cheapest* guide in one specific sense: *"a Cyberpunk building is drawn once and
barely needs a through-line at all,"* because nothing comes after it. The through-line work was
front-loaded into era one.

**Footprints are not yet authored for these nine** — they resolve to `DEFAULT_FOOTPRINT`, 2×2
(`DEFAULT_FOOTPRINT` and `footprintFor`, both in `worldLayout.ts`), and are **fixed forever**
once authored (INV-ERA-1).

**The labels above are DRESSINGS, and D-ERA29 makes that a fact about the DATA rather than a
caveat.** A display name is `"{stable}, {subtitle}"`: the **stable** half is era-neutral,
shipped and never moves, and the **subtitle** half is the era's dressing. So the plain naming
pass D-ERA9 asked for has LANDED for the six masses that carry buildings today, and what this
guide owes in its place is a **subtitle row** — one proper-noun dressing per mass, of the kind
era one's §6 already carries. Until this era's row is ratified it shows the stable name alone,
and the same two-part shape applies to the roster nodes above once they have buildings. See era
design §6.2a and `../README.md`.

**Per D-ERA8 none of these symbolises its lesson.** Waves and rotation are the era's read and the
temptation to put a sine wave on a façade is at its highest here — **it is still forbidden.** The
Neon Plaza is not "the angles building"; it is ordinary public ground that happens to host TRG.1.
*(This read "the dish yard" until `TRG.1`'s 2026-07-30 re-author, and the warning got sharper with
the change rather than softer: a plaza invites a round centre with paving radiating off it, which
is a protractor at full size. §5's `yard` entry states the ban in terms.)*

> **`TRG.8` WAS THE ONE ROW IN THIS TABLE THAT NAMED NO MATERIAL, and it was filled in on
> 2026-07-29.** It read *"An exchange hall: a deep floor plate under a lit soffit, cable risers
> expressed on the elevation"* — form, and nothing else. Every sibling names what it is made of
> (`TRG.2`'s clad box, `TRG.3`'s clad shed, `TRG.5`'s blank monolith, `TRG.7`'s dark glass), and
> under the re-dressing ruling **this drawing is the only one this building will ever get**, so a
> row with no material was the row most likely to be drawn wrong. It now carries all three of the
> era's register cues: the **dark composite panel** with seams and fixings expressed (§2), the
> **emissive edge** as a lit reveal under the soffit (§1), and the **layered ground** — it lands on
> the deck and cantilevers over the older street (§3).
>
> **Two constraints shaped it and neither is obvious from the row.** It stays **new-built**, because
> §5 separates the era's three hall-mass buildings by exactly that: the inherited interchange hall
> is the one that is *occupied from above*, and `TRG.3` and `TRG.8` are the two that are not — so
> making this a retrofit *of* something would have collapsed the distinction that keeps three halls
> apart. And the **animated board is era ornament, not the lesson**: §1 puts the moving count on
> buildings everywhere in this town and forbids it from ever showing a building's own subject. An
> exchange hall is where a whole session's worth of figures is read off, which is why this is a
> plausible institution for `TRG.8` to sit in — but the trig equations live in the **lesson framing**
> at the foot of this guide, and nothing on the elevation may hint at them.

---

## 5. The seven masses, re-dressed

> **REFERENCE ONLY since 2026-07-29, and read this before drawing from it.** The re-dressing
> ruling (this guide's head banner, and era design §6.1) means **no mass in this section is ever
> re-dressed**. What is still owed here is the era's look for the **six masses** its own **9 new
> nodes** sit on; the treatment of every other mass, and the forward chain through it, is kept as
> the best available description of that mass's **shape language** and will not be built.
>
> **The section is deliberately not cut**, because whoever draws this era's own new building on a
> mass still needs to know what that mass *is* — and because a chain break recorded here is a
> finding about the shapes rather than about a re-dress.

The nine buildings above are new to the era. **These seven are the ones the era inherits** — era
one's six shipped masses plus the Town Hall landmark. *(Since 2026-07-29 the era inherits them as
STANDING buildings and does not redraw them; only the hall is drawn again here. What follows is
reference — see the note under this heading.)* This was to have been the last time any of them is
re-dressed, so it is where all seven chains close. Per §6.1 of the era design the six ordinary types are dwelling, workshop, store, hall,
tower and yard, and **since 2026-07-29 those six words ARE the mass ids** — so there is one
vocabulary here rather than two. Era one's guide and `buildingAssets.ts` had kept the retired
Gridwork art's own names (*deco*, *slab*, *rowhouse*, *school*, *park*) because that art was
what the ids were coined for; the old-to-new mapping was **already one to one**, so no mass
was reused and no two nodes collapsed onto one id. **Nothing on disk moved** — a GLB filename
is built from the node id, never from the mass. Plus the `town-hall` landmark.

**The plots do not change.** Footprints are frozen for all ten eras (INV-ERA-1) and the table
lives in `../era-01-prehistoric/style-guide.md` §6 rather than here. In words: the hall and the
dwelling share **the square full plot**; the store is **the long two-cell strip**; the yard is
**the two-cell strip on the short axis**; the workshop has **a single tile**; the landmark has
**the wide plot**. **All nine of this era's roster buildings land on a mass the chain also uses** —
two more on the hall, two on the tower, two on the workshop and one each on the store, the dwelling
and the yard — so every entry below says which instance carries the chain and on which axis the
pair separates. **Three of them described the roster building in the chain's own words** and are
corrected in place: `TRG.5`'s data store, `TRG.7`'s signal lab and `TRG.1`'s dish yard. *(`TRG.1`
has since gone further than a correction: it is **re-authored as the Neon Plaza** on 2026-07-30 and
is no longer a yard of dishes at all — the `yard` entry below carries the form.)*

**The tower's plot is deliberately not named**, for the reason
`../era-02-neolithic/style-guide.md` §5 records: it was set to a single tile and reverted to the
square full plot on 2026-07-28, because a contain-fit applies one uniform scale and a smaller plot
therefore shrinks a model whole rather than making it slender. **Slenderness is a property of the
model**, which is why the closing paragraph of this section talks about the mast's proportion and
not about the ground under it.

**hall — the interchange hall (the square full plot).**
**The era-nine concourse, still standing.** The deck now runs over it, its roof has become the floor
of something else, and it is still one clear span with glazed ends underneath. **Level with the
plant stack and outside the top two**, which is where this mass finishes the run after beginning it
at the top. *Through-line: one big communal roof.* This is the run's purest piece of
retrofit: the building is not replaced, it is **occupied from above**, and the roof that was the
whole point of the chain for nine eras is now load-bearing for a street. TRG.3's broadcast hall and
TRG.8's exchange hall are the era's other hall-mass buildings and neither is confusable with it,
because both are new-built rather than built-over: `TRG.3`'s hall — announced as **the Hologram
Theatre** — is a wide clad shed with a glazed control gallery along one face, the exchange hall a deep
floor plate under a lit soffit with cable risers on the elevation. They separate from each other by section — one is a shed, the other
is a slab of floor.

**store — the louvred monolith (the long two-cell strip).**
A long windowless block with a louvred plant band and **its contents advertised across the front
instead of shown**: stacked signage, lit lettering, an animated display. **Low and long, level with
the signal lab and above only the dish yard.** TRG.5's data store in the roster above is a second
building on this mass, one node each per D-ERA7; **the era-one store is the one carrying the
chain, and the advertising front is what makes that true.** TRG.5's Data Vault is the **unmarked**
monolith —
the same blank block and louvred plant band with **no signage on it at all**, one service door and
a hazard plate — so the pair separates on the one prop the chain cannot do without. *Through-line:
a long horizontal roof, contents on show* — see the flag below, because this is where "on show"
finally stops being literal.

**dwelling — the capsule stack (the square full plot).**
Living modules in a structural rack with walkway galleries on the outer face, **second only to the
comms tower, so the housing ends the run as the tallest inhabited thing in the city**, and
**the shared yard reduced to a lit void in the middle of the rack** — open, bounded, overlooked
from every gallery, and never touched by daylight. TRG.9's capsule stack is the same dressing on its
own plot and a separate building; **this one carries the chain, and it is the one that must keep the
void.** *Through-line: several small dwellings, one shared yard.* Era one's Hut Cluster was three or
four huts round packed earth; the capsule stack is forty modules round a void. The idea survives ten
eras: small individual dwellings arranged around one shared open space they all address. It survives
*vertically*, which era one did not predict and which nothing in the chain forbids.

**`TRG.9` is re-authored as the Quantum Core, so era ten draws no skill housing at all.** The form,
quoted from `output/imagegen/era-10-cyberpunk-building-briefs/README.md`, which authored it:

> **A low broad isolation hall standing clear of the deck on visible anti-vibration bearings.** One
> sealed rectilinear shell of seamed dark composite panel, **wider and deeper than it is tall**,
> lifted off the deck on a rank of squat isolator mounts so **a continuous band of air runs under
> the whole building** and you can see daylight through the gap from any azimuth — the building
> touches nothing. **No galleries, no walkways, no modules and no windows.** A **cryogenic plant
> rack** of ducts, headers and vessels is bracketed along one long elevation in the open, and a
> **field of finned heat-rejection units** stands in a regular rank across the flat roof, which is
> the whole of the top edge. One **deep-set inspection reveal** of switchable glass is cut into the
> entrance face — the only opening — with the **suspended cylindrical cryostat** hanging on its
> stays behind it, and beside it an **airlock-scale personnel door with an interlock plate**. The
> lit surface is **one emissive line following the shadow gap along the underside**, so the
> building appears to be outlined at its base rather than resting on it, plus the reveal's own
> frame. **No signage stack and no animated display.**

**The isolation is the whole building and it has to read at full zoom-out.** A quantum core fails if
anything touches it, so every decision above is that one idea: lifted off the ground, sealed on
every face, its plant outside because it may not be inside, and one window that exists so an
inspector can look without entering. **If it reads as a plant room the building is gone**, and the
band of air under it is the cheapest and most legible carrier of that.

**What this costs the mass, reported rather than argued away.** `TRG.9` carried this chain's
dressing on its own plot, and the pair separation above — *the same dressing on its own plot, and
this one carries the chain and must keep the void* — **is retired with the building.** The
inherited instance is the only `dwelling` era ten stands beside, it wears **era one's** clothes
under the re-dressing ruling, and it is never drawn here; so the form change breaks no separation
that was going to be needed. **But era ten now draws no housing on the skill side at all**, and
three things go with that: the run's closing statement about how this city houses people, the
second place in §3's height ranking (an isolation hall is low and broad, where the capsule stack was
second only to the comms tower), and any built home for the *lit void*. **The capsule form is not
lost, it MOVES** — `civic-buildings.md` authors the bought livability row as a structural rack of
stacked lit modules with walkway galleries, which is `TRG.9`'s old description almost word for
word, so the stack is still drawn in era ten as **The Pod Apartments** at 1×1. **And it removes a
real within-era duplicate**: before this change era ten held two capsule racks with walkway
galleries on one island, one earned and one bought.

**Where the Quantum Core must not read as its neighbours**, since it is now the era's third sealed
panel box. Against **`TRG.5`'s Data Vault** (`store`): the Vault **lands flat on the deck** with a
horizontal louvred band and nothing above its parapet, and this **stands clear of the deck** on
bearings with a field of finned units across its roof — a shadow gap under one and a busy top edge
on the other. Against **Drone Command** (`workshop`): a blast wall with a populated roof deck
against a sealed shell with a plant field, and Drone Command sits **on** the ground where this is
lifted off it.

**workshop — the signal lab (a single tile).**
Two storeys of dark glass over a service base, test rigs on the roof, an animated display across
the parapet. **Level with the data store, and among the lowest things in the city.** TRG.7's test
annexe carried this dressing word for word and is now the **retrofit** version: **one** storey of
dark glass rather than two, on a bracketed frame straddling an older roof rather than standing on
its own service base, its test rigs out on an open antenna deck, and **no display anywhere on
it** — which is the separation that matters, because the animated display is all this chain has
left and it cannot be shared. *Through-line: a shaded open floor with something to mark on* — and
era nine recorded this chain as **broken**, so era ten inherits the break rather than the chain.
The animated display is the descendant of the tally post; the open floor is gone and cannot come
back. *(`TRG.7` is now announced as **the Robotics Lab**; nothing above moves — the retrofit, the
single storey, the open antenna deck and the absent display are all still what §5 authors.)* **TRG.2
is the third building on this mass and is re-authored as Drone Command.** The form,
quoted from `output/imagegen/era-10-cyberpunk-building-briefs/README.md`, which authored it:

> **A hardened control block on the deck with a flat drone deck on its roof.** One squat
> blast-walled volume of seamed dark composite panel with **no public entrance anywhere** — a
> single vehicle-scale armoured door on one face, and nothing else at ground. On the roof, a
> **flat launch-and-recovery deck** ringed by a low blast parapet, with **landing cradles in a
> rank** across it and **a wall of parked drones in an open rack** along the sheltered side, so the
> top of the building is populated and the bottom of it is shut. A single **canted operations
> gallery** of dark switchable glass bands one elevation at first-floor level, angled out to look
> over the deck, and it is the only glazing on the building. **Bracketed conduit and cable tray
> climb the blast wall in the open** to a corner mast of sensor and antenna clusters. The lit
> surface is **one emissive line along the blast parapet at deck level, and an emissive edge strip
> on each landing cradle** — nothing else. **No signage stack and no animated display**: a control
> post does not advertise, and the absence of the era's identification system is the single
> loudest thing about it.

**The three-way separation on this mass HOLDS and is now better.** It was *"glass over a base,
glass straddling a roof, and no glass at all"* — three sections, one mass, no new geometry between
them — and **`TRG.2` is still the one with almost no glass**: one canted band, the rest of the
elevation blind. What improves is the third member: a blast wall and a clean-room wall do not look
alike, where the old fab shop *was* the era-nine clean room again on a second plot. *(This
paragraph read "TRG.2's fab shop is the third building on this mass … and it is the era-nine clean
room again, which is the honest picture: this mass has been sealed for two eras." The observation
was honest and is no longer true; the mass is sealed twice in era nine and once here, and this one
is sealed by armour rather than by cleanliness.)*

**This closes the defence lineage**, one building per era from era three onward: era three's
Stronghold, era four's Barracks, era five's The Castle, era six's Cannon Tower, era seven's Cannon
Factory, era eight's Nuclear Weapons Facility, era nine's Air Force Base, and this. **Seven of the
eight are skill buildings and era five's is a civic**, so the line is not uniform — worth knowing
before writing that a defence building is always earned. The brief states what the line asks
of the last entry: it runs *"from a wall you stand behind to a machine you send out"*, and *"it has
been losing its people the whole way. Drone Command is where nobody goes at all."* **Draw the
ground as shut and the roof as busy** and it reads as the end of that line without referring to any
earlier one. *(Era ten's brief recorded era eight's entry as the **Missile Silo**; the lead's final
name is the **Nuclear Weapons Facility**, and both that brief and era eight's guide now say so.)*

**yard — the steerable dish yard on the deck (the two-cell strip on the short axis).**
A gridded pad with steerable dishes, cable trays running between the mounts, planting in lit
containers, and weed in the deck gaps. **The lowest plot in the city, and the dishes on their
mounts are the only thing standing on it.** TRG.1's yard is a second building on this mass and had
carried this dressing word for word. *Through-line: open ground deliberately kept open.* **Ten eras,
and the CHAIN's plot has never once risen** — swept earth, threshing floor, weighing yard, paved
court, kitchen garden, parterre, works yard, mown park, planted dish yard, and now a deck pad. In a
run where every other mass ends the era ranking far above where it started, the chain yard's refusal
to grow is the clearest evidence that the chains were designed rather than drifted into. Say it
plainly: **it held for the whole run** — and era ten is the last era that could have broken it,
since `TRG.1` is a plaza and a plaza is ground.

**`TRG.1` is re-authored as the Neon Plaza, on the lead's ruling that a fenced equipment yard and a
plaza are opposites with no reading that reconciles them.** Its plot is the era's uniform **2×2**
default and does not move (INV-ERA-1); everything below is authored inside those four cells. The
form, in full:

> **An open square of deck with nothing standing on it, and every edge on it lit.** The whole plot
> is **one continuous walking surface** — perforated metal deck and dark composite panel over
> structure, the same fabric as the street it continues from — with **no fence, no gate, no mesh, no
> kerb and no boundary of any kind**: the plaza is defined by where the buildings around it stop,
> not by anything drawn round it, and that unbounded edge is the first thing that has to read. Its
> content is **level rather than object**. A **broad shallow terrace two risers up** takes one
> corner; a **long bench-step** runs the length of one side, one riser high and deep enough to sit
> on; and on the side that meets the void the deck **cantilevers out past its structure** and stops
> at a plain rail with no wall under it. **Every one of those edges carries an emissive line in its
> nosing** — the terrace lip, each tread, the bench-step's front edge, the underside of the rail —
> so from the camera the plot reads as **a few parallel lit lines lying flat on the ground and
> nothing else.** The deck panels themselves are **dark and unlit**, and **no light comes up through
> them.** Nothing on the plot rises above the rail: **no mast, no gantry, no canopy, no stall, no
> planter, no dish, no cable tray, no drone dock, no signage stack and no animated display.**
> **People are the only occupancy** — standing along the rail, sitting on the bench-step, crossing
> it — and they are what the building is for; the era's habit of accumulating signage on a frontage
> is answered here by there being **no frontage at all.**

**It does not rise, and the two risers are not an exception to that.** The chain's discipline is
that this plot never carries anything standing, and it survives here on the same reading era two's
Sheep Pen was re-authored under — *"a boundary is not a building, which is why re-authoring `RAD.2`
could not lift the one plot that never rises."* A step is not a building either: **the tallest thing
on the plaza is the rail at the cantilevered lip**, which is lower than the dishes on their mounts
that this node used to carry, so `TRG.1` is now **more** clearly the lowest thing era ten draws than
it was. §3's *"the yard still does not rise relative to what it stands on"* holds without
qualification.

**Where the light is allowed to be, and this is the constraint most likely to be broken.**
`../../City_Art_Bible.md` §2 gives **one soft key light, three face tones per hue and no runtime
lights**, so every bright thing on this plot is an **emissive surface belonging to this model** and
nothing else. **No glow, no bloom, no halo, no falloff painted onto the deck beside a lit nosing, no
pool of light, and nothing on the plot lit by anything else** — the panel next to a lit line is the
same three tones it would be with the line switched off, and the model must be drawable that way.
The lines are **trim**, which is §1's word: *"It is not there to illuminate anything, and that is
what makes it ornament rather than lighting."* A neon plaza is exactly where an author reaches for a
glow, and the answer is that **this plaza has more lit edges than anything else in the era and not
one lit volume.**

> **Measured against the renderer rather than asserted, at `e3b715a`.** The whole city's rig is
> `apps/web/src/city/three/CityLighting.tsx` and it is four lights for the entire scene: one
> `hemisphereLight`, one `ambientLight`, one shadow-casting `directionalLight` (the key) and one
> `directionalLight` for the rim. **There is no `pointLight`, `spotLight` or `rectAreaLight` anywhere
> under `apps/web/src/`, and no `EffectComposer` or bloom pass** — so a glow, a halo or a pool of
> light on the deck is not something the engine could draw even if a model asked for one. **What it
> does support is exactly what this entry asks for:** `PlacedBuilding.tsx`'s `reviveMaterial` reads
> each GLB material's own `emissive` and lifts `emissiveIntensity` to `1.2` wherever it is non-zero,
> which is an emissive **surface** — it brightens the face it belongs to and lights nothing else.
> **Nothing authored above asks for anything outside that.**

**Why the light reads as an event here, which is the other half of the same constraint.** Era eight
allows **no emissive surface of any kind** — its §2 names it as era ten's signature and withholds it
outright — and era nine allows it only as signage and a lit crown, **never as a whole face**. A
player arriving on this deck has spent one era with no lit material at all and one with light only
as lettering. **Era ten's reply is not more light but a different place for it:** at their feet, in
the ground they are standing on, in lines they can follow. That is what makes the arrival legible
without a single lumen being added to the scene.

**Per D-ERA8, and this is the sharpest instance in the run.** `TRG.1` hosts **measuring angles,
degrees against radians and coterminal angles**, and a plaza is one careless decision from being a
protractor: **no circular centrepiece, no radial paving, no arc, no circle inscribed in the deck, no
compass rose, no marks set round anything at intervals, and nothing that turns.** The plot is
rectangular, the terrace and the bench-step are **straight and parallel to its sides**, and the lit
lines all run **one way**. §4 already warns that a lit band that undulates is a graph; a lit ring
with ticks on it is a dial, and it would look good, which is what makes it dangerous.

**What separates the plaza from everything else that is open ground, and there is more of it than
there looks.** Under the no-re-dress ruling every one of these stands on the island at the same
time, so each is answered rather than assumed. The `yard` mass carries **nine** buildings across the
run — eras five and seven put no node on it — and the plaza is the ninth.

| Standing on open ground | What it is | The one thing that separates the plaza from it |
| --- | --- | --- |
| **the chain's deck pad** *(era ten, REFERENCE ONLY — never drawn)* | A gridded pad of steerable dishes with cable trays between the mounts, planting in lit containers, weed in the deck gaps | **Equipment against people.** The pad's ground is machine ground and its planting is what proves the openness deliberate; the plaza has **no equipment, no tray and no planting at all**, and what proves *its* openness is a step built to be sat on |
| **the Sheep Pen** *(era two, `RAD.2`, 2×2)* | A continuous knee-to-waist run of wattle hurdling round hoof-churned earth, subdivided into a holding pen, a race and a catching pen, one low mud-brick wall on the windward side | **A boundary that IS the building against a building that is only its floor.** Era two's own §5 says the whole of that building is its boundary; the plaza has no boundary and no subdivision, and it is one undivided surface where the pen is three linked ones |
| **the Barracks' drill ground** *(era four, `POL.2`, 2×1)* | Compacted earth held by a low ashlar wall with a single gate, at one end of a plot whose other end is a roofed range of cells behind an arcade | **Subordinate against whole.** The drill ground is the leftover end of a building's plot, walled, with one way in and its surface deliberately left unmade; the plaza is the entire plot, unwalled, with no way *in* because there is no way *out*, and its surface is manufactured deck |
| **the Clearing** *(era one, `NUM.4`, 1×2)* | Swept earth with a hearth ring, a drying rack and one tree left standing | **Unmade against made.** Both are unbounded, which is why this one needs saying: era one's is ground that has been *cleared*, with three objects on it and a fire; the plaza is ground that has been *built*, with no object on it and no fire |
| **the Ingot Yard** *(era three, `LIN.5`, 2×2)* | Open to the sky with a stone weighing table, a hand balance on a trestle and a banded weight chest — nothing above waist height | **Furniture for work against furniture for standing.** Era three's props are instruments and the ground is a workplace; the plaza's only furniture is a step, and nothing on it is used for anything |
| **the Mapmakers' House** *(era six, `CG.1`, 2×2)* | A paved court set out with a surveyor's baseline, ranging rods and a plane table, under an open loggia on part of it | **The closest of the eight, and it separates on cover and on marking.** Era six's court is *roofed along one side* by its loggia and its paving is *set out with a measured baseline*; the plaza has **nothing overhead anywhere** and **no marks in its surface at all** — which is also what keeps it clear of D-ERA8 |
| **the Cannon Tower** *(era six, `RAT.5`, 2×2)* | A squat rusticated drum with embrasures and a ramp up one flank | **Flat against standing**, free at any zoom |
| **the Power Station** *(era eight, `FUN.10`, 2×2)* | A tall ribbon-glazed turbine hall with a blank boiler house behind it, an open switchyard and lattice gantries in front behind a mesh fence | The open half is **fenced and gantried and subordinate to a hall**; the plaza has no fence, no gantry and no building on it |
| **the Air Force Base** *(era nine, `EL.6`, 2×2)* | A clear-span hangar with a glazed control tower, and an apron of dishes and antennae behind a double mesh fence | Same shape of answer, one era back: **hangar, tower and fence against nothing at all** |

**Two of era ten's own bought buildings are open ground with neon and people on it, and they are the
live risk rather than the historical ones.** Against the civic **Night Market** (3×2): the market is
**covered** — *"the canopy is the whole of it"* — a tensile roof on stall frames with hanging
signage under it at head height, and the plaza has **no canopy, no stall and nothing hanging**; the
market's light is above you and the plaza's is under your feet. Against the civic **Nightclub**
(2×2): the club is *"the ground glowing rather than a facade"*, and **that read is the club's and
must stay the club's** — its plot is a hole in the deck with a portal, a flight of steps going
**down**, a run of grated slots you can see a lit room through, and two cowls. **The plaza's deck is
solid, has no opening in it anywhere, and nothing is lit beneath it**; its steps go **up** by two
risers and lead nowhere but onto its own terrace. **Lit lines on a solid floor against a lit room
seen through the floor**, and neither reading survives being swapped.

> ## ⚡ RE-AUTHORED 2026-07-30 — what `TRG.1` was, what changed, and the one axis that had to be
> replaced
>
> **`TRG.1` was a fenced equipment yard.** The roster read *"a dish yard: fixed dishes bolted down on
> a fenced pad, cable trays running between them, nothing growing on it"*, and this entry described
> it as *"the **fenced** yard with its dishes bolted down rather than steerable and **nothing growing
> on it at all**, kept clear because the equipment demands it rather than because anybody decided to
> keep it open."*
>
> **The team lead's ruling: a fenced equipment yard and a plaza are opposites, there is no reading
> that reconciles them, and the building moves to meet the name.** Era ten's brief had already
> reported the mismatch as *"the most serious disagreement in era ten's documents"* and as the fifth
> instance of the folder's own worst-defect class — a subtitle naming a different building from its
> node — while noting that era eight's cell had been renamed rather than re-authored for exactly
> this. **This is the correction era eight's cell got the other way round**, and both are now
> consistent: era eight's `yard` is a building and has a building's name, era ten's is ground and has
> ground's name.
>
> **The plot did not move**, per era two's `yard` precedent, which this folder states as an order:
> establish the mass and the frozen footprint first, then author the new form inside them.
> `NODE_FOOTPRINTS` holds no `TRG.*` entry, so `footprintFor("TRG.1")` returns `DEFAULT_FOOTPRINT`
> **2×2**, and that is what the square above is.
>
> **THE ONE AXIS THAT HAD TO BE REPLACED, stated because it was load-bearing and is now false.** This
> entry used to separate the chain's pad from `TRG.1` on **planting**: *"The chain's keeps the
> planting and the weed in the deck gaps, which is the only remaining evidence that this ground is
> open on purpose — the same distinction era eight drew between its municipal park and its pylon
> yard."* That worked while `TRG.1` was cleared **because equipment demanded it**. A plaza is open
> **because somebody decided it should be**, so both instances are now deliberately open and the
> planting can no longer carry the difference. **The replacement is what occupies the ground:
> equipment against people** — the pad is dishes, mounts and trays with planting as evidence; the
> plaza is a step, a bench and a rail with people as evidence. The era-eight park/pylon comparison
> goes with the retired axis and is not restated.
>
> **Two claims elsewhere in this guide get STRONGER rather than weaker**, and neither needed
> editing. The subtitle row's *"`the Neon Plaza` is also the reason the `yard` mass does NOT rise in
> era ten: a plaza is ground"* was true of a name and is now true of a building. And the correction
> block below — *"era ten is the one era where the two readings still agree, because `TRG.1` is a
> plaza"* — was resting on the name alone at the moment it was written, which is the weakest possible
> footing for a closing claim about a ten-era chain. **It is now resting on the form.**
>
> **What the era gives up, reported rather than smoothed.** Era ten's fixed dishes were its
> signature technology on the ground, and they are gone from the roster: the chain's pad keeps its
> steerable ones and is never drawn, so **era ten now draws no dish at all.** §4's visible-technology
> list still opens with *"steerable dishes"* and is annotated there; §7's props kit never carried a
> dish. What the era keeps in the air is the **drum antennas at two levels** on `TRG.4`'s mast and on
> `TRG.6`'s, and the **sensor and antenna clusters** on Drone Command's corner mast — so the aerials
> survive, on the buildings that were always going to carry them, and the ground is what stops
> carrying them. **And era nine's brief's *"genuinely dangerous"* pair —
> `EL.6`'s fenced dish apron against era ten's fenced dish pad — is dissolved rather than managed.**
> The two documents had agreed an axis for it (era nine's trays flush in the paving, era ten's
> conspicuously above the surface); **era nine owes nothing on that account any more**, and its own
> rule is left alone rather than reopened, because it is sound for its own building.

> ## ⚡ CORRECTED in the consolidated pass — this claim is true of the CHAIN and false of the MASS
>
> **This paragraph read "Ten eras, and this is the one plot that has never once risen", and "the
> yard's refusal to grow".** Both were claims about the `yard` **mass**, and the mass no longer
> supports them: **the lead has ruled that the yard may rise at era eight's Power Station**
> (`../era-08-atomic/style-guide.md` §5, `yard`), and the defence lineage independently puts a
> standing building on the mass in **era four** (the Barracks), **era six** (the Cannon Tower) and
> **era nine** (the Air Force Base). Four eras out of ten.
>
> **So the correction is a narrowing rather than a deletion, and the sentence is worth keeping.**
> The chain instance — era one's Clearing and its nine forward dressings — is swept earth in era one
> and a deck pad here, and has never carried a roof in any of them. That is the property the
> through-line exists for and it is intact. What is gone is the wider reading, in which no building
> anywhere in the run stood on this mass.
>
> **Era ten is the one era where the two readings still agree**, because `TRG.1` is a plaza. So the
> closing line survives on its own terms: the chain held for ten eras and era ten kept it.
> `../era-08-atomic/style-guide.md` §5 carries the ruling and the full four-era list;
> `../era-09-information/style-guide.md` §5 carries the same correction for its own restatement.

**tower — the comms tower.**
A lattice mast rising from a clad equipment podium, drum antennas at two levels, an external cage
ladder up one face, a lit hazard beacon at the top. **The one thing in ten eras authored to brush
the 24-unit ceiling, and the only thing that ever should be** — the ceiling is a cap that silently
squashes, so it is spent once, here. *Through-line: a slender open frame you climb to see from.*
**This is the strongest chain in the run and it closes exactly as it opened** — era one's Lookout was
a lashed frame with a ladder up one face and you could see through it; so is this, in steel, ten eras
later, with the climb still on the outside. It is also era one's stated destination, *a comms mast*,
landing word for word. The era's other two tower-mass buildings are the same species at lower
height: TRG.4's mast sits on a broader equipment podium, and TRG.6's is slimmer, guyed, and stands
on a retrofitted older roof. **Only the inherited tower reaches the ceiling, and only it keeps the
cage ladder** — the climb belongs to the chain, so it stays with the building that carries it.

**landmark — the vent (the wide plot).**
A lit plant stack rising through the deck, exhaling steam through gratings at its foot, **level with
the interchange hall in the era's ranking**, with **people gathering at the warm grating because it
is the only warm place on a cold deck.** *Through-line: a sheltered communal fire.* Era one's Great
Hearth was a stone ring under a canopy where people stood to keep warm. Ten eras later the fire has
become a boiler, then a plume, then waste heat, and now an exhaust — and people are standing at it to
keep warm again.

### The three closures this era records

**The tower closes as it opened, and it is the one chain that never had to compromise.** An open
frame you climb, with the ladder visible, in era one and in era ten. Six eras of masonry hid the
climb in a shaft and era eight gave it back; era nine kept it; era ten ends with it. Nothing in the
seven was easier to hold or worth holding more.

**The store chain ends changed.** *Contents on show* began as an open gable end with the racks
visible inside, softened in era nine to goods behind glass, and closes here as a windowless block
with its contents *advertised*. The through-line survives as a promise about the front of a long
building rather than as a fact about what is inside it — a real change of meaning, and worth
recording as one: the long horizontal roof holds for all ten eras, and "on show" holds for eight.

**The landmark closes the run.** The island's first building was a fire people gathered at, and
its last is a vent people gather at.

### Era one's six predictions, checked to the end

Era ten is the only guide that can score era one's §6 predictions, because it is the only one with
nothing after it. All six are quoted from `../era-01-prehistoric/style-guide.md` §6.

| Chain | Era one predicted | Outcome |
| --- | --- | --- |
| hall | granary rotunda, basilica, domed hall, transit concourse | **Landed**, with era four's correction — the basilica became a tholos market hall, and the concourse arrived in era nine on schedule |
| store | market colonnade, warehouse, retail block | **Landed** |
| dwelling | courtyard block, terrace, apartment slab | **Landed — onto ground that was already taken.** Era 8's `FUN.9` held the slab too, and was re-dressed on 2026-07-28; the chain's slab keeps the bounded court era one now names as this chain's invariant |
| workshop | portico, schoolhouse, lecture hall | **Landed, but the through-line did not** — every predicted building appeared, and the shaded open floor was lost anyway |
| yard | garden, plaza, park | **Landed** |
| tower | bell tower, clock tower, comms mast | **Landed exactly — and twice onto ground that was already taken.** Era 5's `RAT.4` held the bell tower and era 7's `POL.5` the clock tower; both were re-dressed on 2026-07-28, and era one now names the climb and the open head as the invariant rather than the towers |

**All six predicted destinations arrived; one needed a correction on the way, and one arrived after
its through-line had already failed.** The workshop is the instructive case: era one predicted the
*buildings* correctly and still lost the *idea*, because a portico, a schoolhouse and a lecture hall
are a sequence that walks indoors. Naming a destination is not the same as protecting a meaning,
which is the one lesson this run leaves for anyone extending it.

**On its own this table scores the wrong thing, and that correction is worth more than the scores
are.** *Landed* and *Landed exactly* answer whether the destination arrived. **They cannot answer
whether anything was already standing on it** — and for the dwelling and the tower something was,
in three eras between them, found by a 2026-07-28 sweep of all 19 predicted forms against all 56
roster buildings in the nine later guides. **A prediction that comes true is the one nobody
re-reads**, so naming a specific building *type* is at its most dangerous exactly when it
succeeds; the hall's collision was caught first only because it is the one prediction the chain
could not follow. Both rows above now carry what the score left out, and era one's two lines name a
**property** beside the form for the same reason: a property cannot be occupied the way a type can.

---

## The island (D-ERA26)

The end of the arc. **The shoreline is wholly constructed and the original island is only
readable underneath** — glimpsed at the base of things, in a surviving fragment of older wall, in
the one place the rock still shows.

**The step from era nine, and it is the last one, so it is the one that has to close something.**
Era nine's floor was **solid, sealed and on structure**: unit paving over podiums and service
voids, with the covers closed and nothing visible underneath however much was under it. **Era ten
opens it.** The walking surface becomes a **deck with gaps you can see down through**, and what
you see through them is the previous era's paving. **That is the whole advance in one image**, and
it is the exact distinction era nine was told to protect and not spend: *on structure* becomes
*over the ground*, and the difference is whether you can look down.

**And it closes the ten-era ground arc.** Era one's ground was soil you walked on. **Era ten's is
not ground at all** — per §2's closing ledger, *soil as the walking surface* was last used in era
eight. **Nothing on this island is earth**, and the player can see that because they can see
through the floor to where the earth used to be.

**Ground.** **Layered, not paved.** The walking surface is a **deck** — perforated metal, dark
composite panel, resin with aggregate — carried on structure above the older ground, with
**gaps and grilles you can see down through** to servicing, water and the previous era's paving
below. Wet almost everywhere, so the ground is **reflective** and carries the signage as colour.
Level changes are ramps, stairs and lifts stacked close together. **Nothing is soil.**

**Three things make this a deck rather than a dark pavement, and all three have to be present:**

- **You can see through it.** Grilles, gaps at the panel edges, an open joint at a level change,
  a slot where a service rises. **Not everywhere and not most of it** — enough that a player
  looking at the ground finds somewhere to look *into*. This is the single feature era nine is
  forbidden and era ten is defined by.
- **It has an underside, and the underside is occupied.** Servicing, ducting, water, lit gantries
  and the pontoon terminal all live below it, so the deck reads as a lid on a used space rather
  than as a surface on fill.
- **It stops.** A deck has edges — it cantilevers over the water, it ends at a rail, it steps up
  over an older roof. **Era ten does not build on cleared ground** (§1), so the deck goes *around*
  what was already there and its outline records what it went around.

**Wet, and this is the ground's colour strategy rather than weather.** A dark deck under a dark
city has no value range of its own; standing water is what gives it one, and it does so by
**carrying the signage down onto the floor as colour**. See the contrast note below, because this
is the one era in the run where the ground's legibility is solved by light.

**Shoreline.** **Entirely built, and vertical again.** Sheet-piled and clad edges dropping into
channelled water, service galleries and outfalls expressed on the face, mooring and fender gear
bolted on. In places the deck **cantilevers out over the water** so there is no edge at all,
only an overhang and a rail. **The original island survives in exactly three ways** and they
should be findable: a stretch of Bronze Age or Classical masonry left in the new face like a
fossil, one small patch of raw rock and gravel beach preserved behind a barrier, and the
Renaissance balustrade reused as a handrail on the deck above. **These are the run's most
important authored survivals** and this section names all three, which is what makes them
composition rather than stratified ground (D-ERA33) — era ten is *choosing* to show three
fragments, not failing to re-dress three patches.

**Vegetation.** **Engineered and sealed.** Planting in lit containers and vertical green walls,
species chosen to survive shade and salt, tightly clipped or fully enclosed. The vertical farms
carry more living matter than the ground does, and it is behind translucent panels rather than in
the open. **A little unmanaged weed persists in the deck gaps, which is the only wild growth left
and worth including for exactly that reason** — it is also the last surviving descendant of era
one's scrub, growing in the one place on the island that is still, accidentally, open ground.

**Water.** **Channelled and lit.** Dark, deep against the structure, constrained into defined
channels rather than lying in a basin. Lit from the edges and from below, so it carries reflected
signage and reads as a surface rather than as a depth. Clean but unmistakably **contained** —
which closes the arc from era one's pale shallows that you could see the bottom of.

**Where boats land.** **Integrated, at multiple levels.** An enclosed pontoon terminal under the
deck with lit gantries and gates, small craft berthed between structure, and the whole thing
reading as one interchange among several transport layers rather than as a harbour.

**Signs of habitation at the margins.** Dense stacked signage. Cable trays, conduit and ducting
run openly across faces. Vents exhaling steam. Cameras and sensors in clusters. Delivery drones
docked on the deck edge. **A scrolling figure or a panel cycling through numbers**, which is the
tally motif's last step. Puddles, and rubbish caught in the gratings.

**Against the roads (D-ERA30), and era ten is where the distinction nearly dissolves.** The deck
*is* the circulation, so the road and the ground are closer to being one surface here than in any
era since era four — and the resolution is the opposite of era four's. There, the road was the
ground plus a kerb; here **the road is the ground plus LIGHT**. A route is marked by **lit seams,
edge strips and emissive banding let into the deck**, not by a change of material or a raised
edge, because a deck is level and continuous by construction. So the relation to state is:
**D-ERA30 owns the lit route markings and the deck panel module they sit in; the island owns the
deck itself, its gaps and what shows through them.** Whoever writes era ten's surfacing row
should reach for *deck panel + emissive seam* and should not author a second deck. **This is also
the era where D-ERA30's `markings` course returns** — era eight painted them, era nine let the
pattern carry them, and era ten lights them.

**What the era's absent list rules out, and era ten's list runs BACKWARDS.** §2 withholds nothing,
because there is no era eleven; its paragraph is a **closing ledger of what has left the island
for good**, and read against the ground it is a list of things era ten may not reach back for:

- **Thatch (last era two), the external timber frame (era five), lime mortar and dressed ashlar
  as a wall rather than a facing (era six), brick as mass and cast iron (era seven), soil as the
  walking surface (era eight), and daylight as the only light source (era nine).** For the island
  that means: **no earth underfoot, no soil-grown planting outside a container, no stone laid as
  a structural wall, and no unlit scene.**
- **The three named survivals are the deliberate exception and the reason the ledger is not
  loss.** Bronze Age or Classical masonry, raw rock and gravel, and a Renaissance balustrade are
  all materials the ledger has retired — and each appears **doing a different job from its
  original one**: the masonry is a fossil in a new face, the beach is an exhibit behind a barrier,
  and the balustrade is a handrail. *"Every material the island ever used is still somewhere on
  it, and none of them is doing its old job."* **A survival that is doing its old job would be
  stratification; a survival repurposed is composition.**

**Contrast against the buildings, and era ten is the only era that solves this with LIGHT rather
than with value.** Body hue **dark composite panel `#4A4E58`** — the darkest in the run — with an
**emissive cyan accent `#5FD0D8`**, standing on a dark deck. On paper that is era seven's problem
again: dark buildings on dark ground. **It is not, and the difference is the accent.** Era seven's
accent was cast iron `#3E4247`, darker than its own body; era ten's *emits*, so **every building
carries its own light and needs nothing from the floor.**

**What that obliges:**

1. **The deck must stay darker than the buildings**, not merely dark. It is the field the emissive
   trim reads against, and §2 already argues the body is the run's darkest *"so the emissive accent
   has something to sit against"* — the ground is one step further down again.
2. **Wet ground is the value relief and it is load-bearing**, exactly as era seven's puddles were,
   but doing the opposite job: era seven's held the pale sky because it had no other light, and
   era ten's hold the **signage** because it has nothing but.
3. **Mastery gold `#FFB703` is reserved and a lit deck is where it will be reached for.** §0
   constraint 3 already warns that a neon palette reaches for gold; a **reflection** on wet
   decking is the same hazard one surface removed. **No warm-yellow light on the ground.**

**And the accumulated city finally resolves — the ground goes dark, and nine eras of pale and
mid buildings light up against it.** Era four's limestone, era five's lime-wash, era six's
stucco and era eight's concrete — the four pale eras that fought each other on every pale floor
from era four onward — **all read at once on this one**, and so do era one's terracotta, era
two's mud brick and era three's ochre. **The only era that shares era ten's ground problem is era
ten**, which has the emissive accent that none of the others needed. **This is worth saying at the
end of the run because it is the arc closing on the legibility question too**: the island began
as a pale ground under warm buildings and ends as a dark ground under lit ones, and the nine
eras standing on it are more legible at the end than they were in the middle.

**The read:** a city that has completely consumed its island, with just enough of the earlier
shore left visible to prove there was one. If a player can find the raw gravel beach from era one
surviving behind a barrier, this era has done its job.

---

## The era's palette (PROPOSED — D-ERA27)

**Status: PROPOSED for Evan's review — not decided.** Per **D-ERA27** hue is an **era** property
rather than a domain one, so this era owns a palette. Derived from the material language this guide
already carries (the **Materials** line under *To author*), kept low-saturation, and sitting on
§1.1's calm parchment base — `#ECE4D3` ground, `#D9CCB2` deep ground, `#8FA9B8` slate-mist water —
rather than competing with it.

| Role | Proposal | Hex |
| --- | --- | --- |
| **Body hue** | Dark composite panel | `#4A4E58` |
| Accent | Emissive cyan, with magenta held in reserve | `#5FD0D8` |

**Why this hue.** Composite panel, smart glass, exposed conduit, emissive signage. The
body is the darkest of the ten so the emissive accent has something to sit against — a
neon palette on a pale body reads as washed out. **This era's §0 constraint 3 already
warns that a neon palette will reach for mastery gold**; cyan and magenta are proposed
precisely because they light the town without going anywhere near `#FFB703`. Emissive
surfaces stay small: signage, conduit runs, window edges, never a whole face.

**One body hue per era.** Within the era, buildings **share the body hue and differ by silhouette
plus accent**, never by a second body colour. That is the one rule that survives `City_Art_Bible.md`
§1.2's retirement, now applied per era instead of per district.

**`#FFB703` is not available**, here or in any era: it is the mastery accent carried on the stars
above a topped-out building, never a material.

---

## 6. The three construction stages

Every building gets three models. The stage names are fixed in code (`buildingAssets.ts:41`), and
the era's job is to make the sequence read as *this era's* way of building.

| Stage | Engine states | Cyberpunk read |
| --- | --- | --- |
| **`site`** | `not_started`, `preview` | **Nothing is cleared.** The previous building still stands, stripped back to frame inside a lit cage of scaffold and netting, with services looped out and running. The hoarding is now an animated screen |
| **`construction`** | `teaching`, `practice` | A **gantry printer running on deck rails** laying up the new fabric, drones ferrying panels to the working face, and **the older building still visible through the new** — kept walls, an old parapet line, a floor level that does not match |
| **`built`** | `unfinished`, `complete`, full mastery | The finished building as described in §5. `advanced` (mastery ≥ 2) and full mastery both reuse this model — there is no separate gilded version, and mastery rides above it as stars (`buildingAssets.ts:28-31`) |

**This closes the run, and it closes it on the first stage rather than the last.** Era one's site was
ground cleared to bare earth: the builders removed what was there before they began, and every era
from two to nine did the same. Era ten's builders never clear anything. Nine eras of empty plots and
then, at the tenth, a building still standing inside the scaffold of its own replacement — the most
era-specific image in this guide, and the cheapest to read at any zoom.

---

## 7. Props kit

§12 budgets a per-era props kit alongside the masses, so that the whole city can be covered by the
ordinary types plus props. Era ten's kit:

- **Animated displays**, the era's tally descendant and one step past era one's prediction: a
  scrolling figure, a climbing bar, a cycling panel, in three sizes.
- **Stacked signage**: lit plates, boxes and projecting blades, some dead and some flickering,
  designed to accumulate on one frontage — the era's answer to identifying a building.
- **Cable trays and conduit runs**: straight lengths, corners, drops, a bracketed bundle, a
  junction box, so that any face can be dressed with services.
- **Steam vents and gratings**: a floor grating with a plume, a wall vent, a stack cowl.
- **Cameras and sensor clusters**: a pole-mounted group, a corner bracket, a dome.
- **Drone docks**: a deck-edge landing plate, a wall cradle, a parcel locker beneath.
- **Planting in lit containers**: a trough, a tall vessel, a green wall panel — plus **weed in the
  deck gaps**, the only unmanaged growth left on the island.
- **Ground detail**: perforated deck panels, service hatches, puddles, and rubbish caught in a
  grating.

---

## The subtitle row (D-ERA29)

One proper-noun dressing per mass, ratified for wiring into `apps/web/src/city/eraDressing.ts`.
The subtitle **enters the accessible name**, so these are capitalised proper nouns rather than
the running prose of §5. This is the last row in the run and the one a player ends on.

| Mass | Stable name | **Cyberpunk subtitle** |
| --- | --- | --- |
| `hall` | Assembly Hall | **the Hologram Theatre** (`TRG.3`) / **the Stock Exchange** (`TRG.8`) |
| `store` | Store | **the Data Vault** |
| `dwelling` | Dwellings | **the Quantum Core** |
| `workshop` | Workshop | **Drone Command** (`TRG.2`) / **the Robotics Lab** (`TRG.7`) |
| `yard` | Commons | **the Neon Plaza** |
| `tower` | Tower | **the Signal Tower** (`TRG.4`) / **the Broadcast Tower** (`TRG.6`) |
| `town-hall` (hub) | Civic Center | **the Steam Vent** |

> ## ⚑ REWRITTEN 2026-07-29 — the second naming pass, off the lead's review of the full 102-building roster
>
> **The rule, and it came from the names that already worked.** The lead approved the tower column
> almost entire — *Grain Silo, Stronghold, Lighthouse, Water Tower, Cooling Tower, Office Tower,
> Mast* — and the reason is that **every one of those names a specific thing that only exists in
> its own era.** Nobody built a cooling tower in the Bronze Age and nobody built a stronghold in
> the Atomic Age, so the name does the era's work by itself and needs no adjective to help it.
>
> **The names that failed all shared one shape: the mass's FUNCTION with a weak adjective in front
> of it.** *Long Store, Raised Store, Goods Store, Goods Shed. Round Granary, Round Hall, Control
> Hall. Cleared Ground, Cleared Field, Paved Court. Grinding Floor, Fitting Shop, Test House.*
> Those describe the mass rather than naming a building, so they read as placeholders and they blur
> into each other down the column — which is exactly how the lead found them, by reading all 102 at
> once rather than one guide at a time.
>
> **So the target is: name the era-specific building that happens to serve this function.** Note
> what this does NOT license. Four of the seven approved tower names are *qualifier + plain
> building noun*, so that shape is fine — what matters is whether the qualifier is **concrete and
> era-locked** (*cooling*, *water*, *grain*) or **weak** (*long*, *raised*, *goods*, *round*,
> *cleared*, *paved*). And the recognisability rule from #231 is unchanged and not negotiable:
> plain contemporary English, nothing a learner must look up, **no untranslated foreign terms**.
> *Campanile* and *Horreum* are perfectly era-specific and both still fail.
>
> **This era puts two nodes on one mass, so the row authors TWO names.** A dressing row is per
> mass and `ERA_DRESSINGS` is keyed per node, so a single name would announce two buildings
> identically. The node each name is wired onto is given in the cell.

**The through-line: short, clipped, and every building is a named facility bolted onto something
older.** The register is unchanged — the vocabulary has been shortening for ten eras and this is
where it lands — and what moved is the three rows where one name had to cover two buildings.

- **the Hologram Theatre** (`TRG.3`) and **the Stock Exchange** (`TRG.8`) for the Exchange Floor.
  Two nodes share `hall`. `TRG.3` is a wide clad shed with a glazed control gallery; `TRG.8` is a
  deep trading floor cantilevered over the older street, which is a stock exchange. **The original
  name also collided with era nine's hub**, *the Exchange*, which is renamed in that guide.

  > **RENAMED *the Broadcast Studio* → *the Hologram Theatre*, and note what the rename FREES.** The
  > word *broadcast* moves from the `hall` row to the `tower` row, where `TRG.6` becomes *the
  > Broadcast Tower* — so the era holds exactly one *Broadcast* either way and the two never
  > overlapped. **The building is unchanged**: a wide clad shed with a glazed control gallery along
  > one face, which is what a hall full of projection kit looks like from outside. *Theatre* is
  > British spelling against the American stable name *Civic Center*, which era ten's brief logged
  > and which is cosmetic; *hologram* is the most era-locked qualifier available and a learner needs
  > nothing explained to them to picture it.
- **Drone Command** (`TRG.2`) and **the Robotics Lab** (`TRG.7`) for the Factory. Two nodes share
  `workshop`, and *Factory* was a bare function word that could describe either. `TRG.2` is
  **re-authored as Drone Command**, era ten's entry in the defence lineage and the building that
  closes it. `TRG.7` straddles an older roof and carries an open rooftop antenna deck.

  > **BOTH CELLS MOVED, and only one of them is a rename.**
  >
  > **`TRG.2`: *the Chip Plant* → *Drone Command*, a FORM change.** §5 has the form in full. The old
  > cell's reasoning — *"a windowless clad box with an airlock and an exhaust stack — a chip plant,
  > and this is the era whose cities are built on them"* — was sound and is retired with the
  > building. **Two collisions go with it**: `../README.md`'s *-plant* pair (era eight's hub **Heating
  > Plant** against **Chip Plant**) is gone, and era nine's `workshop` is now **the Chip Factory**,
  > so *Chip* appears once in the run rather than twice on adjacent eras' workshops.
  >
  > **`TRG.7`: *the Rooftop Lab* → *the Robotics Lab*, a rename only.** The building does not move:
  > one storey of dark glass straddling an older roof, an open antenna deck, and **no display
  > anywhere on it**, which is §5's separator and is untouched. *Rooftop* was doing double duty — it
  > was also `TRG.6`'s qualifier, so the era had *the Rooftop Lab* beside *the Rooftop Mast* — and
  > *robotics* is a product where *rooftop* was a position. **`TRG.7` still sits high**, on the older
  > building that carries it; only the name has stopped saying so.
- **the Signal Tower** (`TRG.4`) and **the Broadcast Tower** (`TRG.6`). Two nodes share `tower`.
  `TRG.4` is a lattice mast rising from a clad equipment podium with drum antennas at two levels;
  `TRG.6` is *"a second, slimmer mast on a retrofitted older roof"*, guyed, with a lit hazard
  beacon.

  > **THE WHOLE `tower` ROW MOVED, and the lead's earlier keep of *the Mast* is REVERSED rather than
  > extended.** The cells read *the Mast* and *the Rooftop Mast*, and `../README.md` recorded the
  > pair as *"deliberate and flagged: one name contains the other on purpose"* — which the new pair
  > no longer does. **Neither building moves.** *Signal* and *broadcast* are both era-locked, which is
  > the test the lead applied when he approved the `tower` column almost entire, and era ten's brief
  > re-ran that column with both names applied: **eight of eleven `tower` dressings now end in the
  > word *Tower***, up from six. **Reported, and it is the lead's column.**
  >
  > **One consequence the brief reported and this guide will not fix**: both cells now repeat the
  > stable name back at the learner — *"Tower, the Signal Tower"*, *"Tower, the Broadcast Tower"* —
  > which is the defect era eight's hub was renamed for. Settled names; nothing about either drawing
  > changes.
- **the Quantum Core** for the Stacks. `../README.md` records *the Stacks* as the one subtitle in
  the run a learner would not merely fail to recognise but **actively misread**, and it also sat
  against the civic **Capsule Homes**; the cell then held *the Module Stack*.

  > **RENAMED AND RE-FORMED: `TRG.9` is no longer a dwelling of any kind.** §5 has the isolation hall
  > in full, and what era ten gives up with it. **`"Dwellings, the Quantum Core"` is accepted** — the
  > lead was shown the announced name and took it, so a dressing disagreeing with its mass handle is
  > settled here and is not to be flagged or substituted. **The collision the old cell was renamed to
  > avoid is gone twice over**: era ten's bought housing is now **The Pod Apartments** and this is
  > not housing at all, so nothing in the era is a stack of capsules except the one building that
  > should be.
- **the Data Vault** for `TRG.5`. The cell held **the Vault**, which `../README.md` lists among the
  ordinary-words-used-evocatively that the rule is *for*, and which named this era's recorded chain
  break — the store's contents stop being visible.

  > **RENAMED, and the chain break it announced stays recorded in §5 rather than in a name.** *Vault*
  > bare was doing well on evocativeness and less well on saying which sealed box this is, in an era
  > that now holds three of them; *data* answers that in one word and is the era's own substance.
  > **The building is unchanged** — a blank monolith with a louvred plant band, no windows, no
  > signage, one service door and a hazard plate.
  >
  > **It creates era ten's sharpest cross-era pair and the brief already named it**: era nine's
  > `hall` is **the Data Centre**, so two adjacent eras' blank clad boxes now both carry the word
  > *Data*, both permanent, one era apart. **They separate on top edge and grain, never on
  > geometry** — era nine ranks chillers along its parapet and era ten's Vault has nothing above its
  > louvred band — and per the *repeated head noun is not the defect* rule the qualifiers are what is
  > tested: *centre* is a place and *vault* is a container. **Reported, not re-litigated.**
- **the Neon Plaza** for `TRG.1`. The cell held **the Deck**, kept on the grounds that a yard which
  is no longer earth needs the era's own word for a surface.

  > **RENAMED, and the new name points at a different building from the one §5 authors** — which era
  > ten's brief flagged and which is recorded here rather than resolved, because the name is the
  > lead's. `TRG.1` is *"the **fenced** yard with its dishes bolted down and nothing growing on it at
  > all, kept clear because the equipment demands it"*, and a plaza is somewhere people stand.
  > **The building does not move**, because moving it would collapse it into the chain's planted
  > deck pad, which is the only thing separating the two. What the name does buy is that *Deck* was
  > the era's word for a **surface** rather than a building, and it stood against the hub's *the
  > Steam Vent* rising *through* the deck in §5's own prose.
  >
  > **`the Neon Plaza` is also the reason the `yard` mass does NOT rise in era ten**, which matters
  > to the correction at §5's `yard` entry: a plaza is ground, so era ten's roster leaves the mass
  > flat where eras four, six, eight and nine each put a building on it.
  >
  > > ## ⚡ OVERTURNED 2026-07-30 — the BUILDING moves, and the mismatch is closed rather than logged
  > >
  > > **The box above is the state at the consolidated pass and is kept as the record of it.** It
  > > reported the mismatch accurately and then declined to fix it, for one stated reason: that moving
  > > the building would collapse it into the chain's planted deck pad. **The lead has ruled the other
  > > way** — a fenced equipment yard and a plaza are opposites and there is no reading that
  > > reconciles them — **and has required the separation to be solved.**
  > >
  > > **It is solved on what occupies the ground, not on planting.** §5's `yard` entry authors the
  > > plaza in full and answers it against every open ground standing on the island: the chain's pad
  > > is **equipment** — dishes, mounts, trays, with planting as the evidence its openness is
  > > deliberate — and the plaza is **people**, with a bench-step and a rail as that evidence
  > > instead. It also answers era two's Sheep Pen, era four's drill ground and six more, plus era
  > > ten's own Night Market and Nightclub, which are the live ones.
  > >
  > > **The bullet's own claim survives intact and is now load-bearing on a form rather than on a
  > > word:** the `yard` mass does not rise in era ten, because `TRG.1` is now a plaza in fact.
- **the Steam Vent** for the Node, which the lead named. *Node* names a position in a network, not a
  building, and a learner cannot see one. §5 authors this landmark as **the vent**: a lit plant
  stack rising through the deck, exhaling steam through gratings, **with people gathering at the
  warm grating because it is the only warm place on a cold deck** — which is era one's *sheltered
  communal fire* arriving at the end of the run, and the plainest thing in the era.

**Kept:** the Stock Exchange (`TRG.8`) and the hub's **the Steam Vent**, and those two are now the
whole of the keep list.

> **THE KEEP LIST USED TO HOLD THREE MORE AND ALL THREE HAVE SINCE MOVED, which is worth recording
> because they were kept on stated grounds rather than by default.** It read: *"the Mast, which the
> lead named; **the Vault**, which `../README.md` lists among the ordinary-words-used-evocatively that
> the rule is for, and which names this era's recorded chain break — the store's contents stop being
> visible; and **the Deck**, on the same grounds and because a yard that is no longer earth needs the
> era's own word for a surface."*
>
> **Each is now *the Signal Tower*, *the Data Vault* and *the Neon Plaza*, and the bullets above carry
> the reasoning per cell.** The *evocative ordinary words* judgement `../README.md` makes is not
> withdrawn by any of the three: era ten still keeps *the Steam Vent* and the *Exchange* in *the Stock
> Exchange*, and the rule that generic is not automatically the fix is unchanged. What changed is that
> two of the three names were bare where the era now holds two or three of the same species — three
> sealed boxes, two masts — so the qualifier is doing work it did not have to do before.

---

## The advisor (D-ERA28)

**Oru, dressed and speaking as a signal engineer.** The learner's companion for the whole Cyberpunk
era and **the last of his ten dressings**, carrying the mini-lesson, the check-your-understanding
prompt and the hint exactly as he does in era one — because he *is* era one's advisor, in this era's
clothes and this era's voice.

**Who they are — THE REGISTER, which is per-era and is meant to be.** The person who keeps the masts
aligned and the links up — who thinks in
**waves, phases and rotations** because that is what a signal is, which is the era design's own
reason for putting trigonometry here. A retrofitter by temperament: this is the era that builds
on top of what is already there without removing any of it, and the advisor works the same way in
this era, adding to a learner's understanding rather than replacing it.

**What they are wearing — THE DRESSING, out of this era's own material language.** A layered
technical jacket with a high collar over a close-fitting base layer, cargo trousers, boots with the
strapping visible. The jacket carries **one emissive trim line** along the shoulder seam and cuff —
the era's signature move, light used as *trim* and never as a surface, which is exactly the rule §1
sets for buildings and which the advisor must obey too. A **coiled patch cable** over one shoulder.
They carry a **handheld field meter** with a small animated readout, which is §1's tally descendant
— the animated display, the one step past era one's prediction — and it is the counterpart of Oru's
staff. **Retrofit is visible on the figure**: the jacket is newer than the boots, and one panel of
it is a different generation, which is this era's whole method worn by a person.

**One hard limit on the trim.** `../../City_Art_Bible.md` reserves mastery gold `#FFB703`, so
this era's emissive line is the era's own accent and **never gold**. An advisor who glows the colour
of a mastery star is a legibility bug, not a style choice.

### The four poses

The same four names as era one, and it matters that the last era still has them: an advance may
**shrink** the pose vocabulary (D-ERA28), every consumer maps its beat through a total typed
table, and a run that keeps the four from end to end means no consumer ever loses a beat.

| Pose | The read | Where it is used |
| --- | --- | --- |
| **`idle`** | At rest. Meter clipped at the hip, its readout ticking over | The resting state; no lesson beat requests it directly |
| **`talk`** | Speaking. The meter up, readout turned out, free hand tracing an arc | Every teaching line |
| **`point`** | Pointing at the work with the meter's stub antenna | A correct answer, a hint, a retry |
| **`squint`** | Reading the meter close, the trim line reflecting off their face | Reading the learner's work; authored and available |

**Still no celebration pose, in the final era, and that is worth stating as a closure rather than
an omission.** The run ends the way it began: a correct answer is met with `point`, and the
congratulation is carried by the reward chip and the mastery star. Ten eras, four poses, no beat
ever lost.

### Palette

The signal-engineer dressing sits inside the era palette: jacket and trousers in the era's dark
neutrals against the lit-deck ground, the base layer a shade lighter, and **one** emissive accent
line in the era's own accent hue. Skin and hair are the only notes outside it. The emissive line is
the only thing on the figure that is brighter than the parchment base, and it should read at
zoom-out as a stroke rather than a glow.

> ## ⚑ THE NAME IS SUNSET — 2026-07-30, under `D-ET9`. THE DRESSING AND THE REGISTER ARE NOT
>
> **THE RULING (the team lead, recorded at `../../2026-07-29-era-trial-contract.md` §19.2),
> verbatim:** *"There is one continuous advisor for the whole run, re-themed per era. Not ten
> advisors."* This section was authored in good faith under the half of **D-ERA28** that has since
> been superseded — *"one advisor per era, belonging to that era"* — and it named era ten's advisor
> **Wren, a signal engineer**. **The name `Wren` is retired.** Era ten's advisor is **Oru**, dressed
> and speaking as a signal engineer.
>
> **EVERYTHING ELSE HERE SURVIVES, and the lead said so in terms:** *"the advisor's prose should
> change across eras though — it's not just a static advisor."* What is continuous is the name and
> the relationship with the learner; **the appearance and the voice are per-era and are meant to
> be.** So the layered technical jacket with its one emissive trim line, the coiled patch cable, the
> handheld field meter and the visible retrofit, the four poses and this palette placement all stand
> exactly as authored — and so does the register above, *the person who thinks in waves, phases and
> rotations, a retrofitter who adds to a learner's understanding rather than replacing it*, which is
> this era's presentation of Oru rather than a second person's personality.
>
> **The pronoun in the prose above is left as authored.** Whether it is part of the per-era dressing
> or a property of the continuous character is the one thing `D-ET9` does not settle, and
> `../README.md` reports it to the lead rather than deciding it here.
>
> **Confirmed from the code rather than from the ruling**, since D-ET9's own argument is that the
> documents drifted from the code and the code was the side that was right:
> `apps/web/src/lessons/OruAdvisorCharacter.tsx` is the tree's only advisor character component, and
> `ERA_ADVISORS` in `apps/web/src/city/eraDressing.ts` is a two-row `Partial` table behind a `null`
> fallback — a costume list rather than a cast. **No name in this era ever reached code or a lesson
> string**, so this retirement is a documentation change with no learner-facing consequence.

---

## Lesson framings

**What this section is.** The era folder carries lesson framing (team lead, 2026-07-29) — how a
lesson sets its mathematics inside the era's world. It replaces the retired island themes spec.

**Three rules it inherits.**

1. **The framing comes from the era's WORLD, not the node's BUILDING** (D-ERA8). The comms tower
   hosts TRG.4; a mast is not a picture of an identity.
2. **This era's absence paragraph looks BACKWARDS**, since nothing follows it to withhold for. So
   the boundary here is not a list of things not yet invented but a list of things that have
   **left**: no brick or timber in a wall, no visible hand-work, no open working floor. A word
   problem set in a workshop with the doors open is several eras out of date.
3. **Theming follows the ERA, not the domain.** This era is one whole domain, so nothing splits.

**The era's context palette — six reusable settings, from this guide's own props:** the **dish
yard** and its steerable dishes; the **mast** with its drum antennas at two levels; the **animated
display** whose count moves; the **retrofit** — new bolted onto old, everywhere; the **lit deck**
over the older ground; and the **broadcast hall** with its control gallery.

*(The **dish yard** is kept deliberately after `TRG.1` was re-authored as the Neon Plaza, and rule 1
above is why: a framing is a fact about the era's **WORLD**, not about a node's building, and a city
that runs on signal plainly has dishes whether or not a skill building is a pad of them. §5's chain
instance still authors the yard as shape language, and §4 lists steerable dishes as era-ten
technology. `TRG.1`'s three framings — aiming by bearing, a sweep returning to its heading, the arc
an antenna covers — are unaffected and are **not** rewritten. What would be wrong is the reverse:
briefing the **art** for `TRG.1` as a yard of dishes, which §5 no longer authors. The word "fixed"
is dropped from this line because it belonged to the old building rather than to the era.)*

**Rotation and repetition are what this era is for.** A signal that repeats, an antenna that
sweeps, a phase that leads or lags — the era design's own words are *waves, signals, rotation,
rendering*, and every one of those is a trigonometric idea this world contains literally rather
than by analogy. **The one thing to avoid is the screen.** It is tempting to frame every trig
lesson as "a waveform on a monitor", which collapses nine distinct nodes into one picture and
teaches the graph instead of the idea. Use the physical thing — the sweep, the mast, the guy
wire, the deck — and let the display be where a result is *read*, not where the mathematics
lives.

| Node | The mathematics | Cyberpunk framings (2 to 3 per node) |
| --- | --- | --- |
| **TRG.1** — measure angles; degrees ↔ radians; coterminal | how far round | (1) **Aiming a dish by bearing**, given in degrees on the pad and in radians by the controller — the same heading, two units, which is the conversion in its natural home. (2) **A sweep that comes back to the same heading** after a full turn, and after two: coterminal, physically. (3) **The arc a rotating antenna covers**, as a fraction of a turn. |
| **TRG.2** — right-triangle trig; 30/45/60; cofunctions | sides and angles of a right triangle | (1) **A guy wire from a mast to its anchor pad**: the height, the ground distance and the wire are a right triangle, and any two give the third. (2) **The elevation to a dish on a roof** across a known gap. (3) **A cable run down a wall and along a floor** against the diagonal it replaces. |
| **TRG.3** — unit circle; reference angles for sine and cosine | position on a turn | (1) **A rotating antenna's position**, given as how far along and how far across from the centre of its pad. (2) **The same reading at four headings**, one per quadrant, with the signs changing and the magnitude not — which is what a reference angle is. |
| **TRG.4** — all six functions; even/odd; fundamental identities | the relations that always hold | (1) **Two instruments reading the same signal differently** and always agreeing when converted, which is what an identity is. (2) **A reading that does or does not flip sign** when the antenna sweeps the other way: even and odd, taken off the equipment. (3) **Checking a meter against itself** using a relation that must hold, which is how a field engineer catches a fault. |
| **TRG.5** — graph sine and cosine: amplitude, period, phase shift | the shape of a repeating signal | (1) **A signal's strength, its repeat interval and how far it lags** — the three numbers an engineer actually names, which are exactly amplitude, period and phase. (2) **Two links carrying the same signal, one arriving later**, as a phase shift you can point at. (3) **A beacon at half strength**, unchanged in every other respect. |
| **TRG.6** — graph tangent and the reciprocal functions; period and asymptotes | where the value runs away | (1) **A dish tracking toward the horizon**, where the correction needed grows without limit as the angle approaches the flat — the asymptote as a physical impossibility rather than a feature of a curve. (2) **A ratio that has no value at one heading**, and the equipment's own error state at it. |
| **TRG.7** — evaluate and compose inverse trig functions | recovering the angle | (1) **Working the bearing back out of a measurement** — the meter reads a ratio and the engineer needs the heading. (2) **Aiming from coordinates**: two offsets on the deck, and the angle to point at. (3) **A composition that returns the input and one that does not**, which is where the restricted range bites. |
| **TRG.8** — solve basic trig equations over an interval | every heading that fits | (1) **All headings in one full sweep at which a signal hits a given strength** — the interval is one revolution and there is usually more than one answer, which is the whole lesson. (2) **When in a repeating cycle a level is reached**, over a stated window. |
| **TRG.9** — sum/difference and double-angle identities | combining two rotations | (1) **Two signals combined into one**, where the sum identity is what says what the combination looks like. (2) **A sweep at twice the rate**, related to the single-rate one. (3) **Simplifying a control expression** so a slower processor can run it, which is this era's own reason for caring about a shorter form. |

---

## What is authored, and what this guide does not decide

Per §12. Footprints are identical in every era (INV-ERA-1) — see
`../era-01-prehistoric/style-guide.md` §6 for the table, and its §0 for the nine hard
constraints every era inherits.

- [x] **Materials** — §2: dark composite panel, dark and switchable glass, exposed conduit and
      ducting, emissive signage, plus the closing ledger of what has left the island.
- [x] **Structural language** — §3: the deck and the layer, retrofit, the rack, expressed
      services.
- [x] **Roof and support forms** — §3: roofs used as floors, plant and rigs as silhouette, lit
      soffits and gratings.
- [x] **Palette** — proposed above (D-ERA27), awaiting Evan's review: dark composite panel with
      emissive cyan. **Still open**, and the harder half: how neon lives inside a warm parchment
      base under a single key light.
- [x] **Level of ornament** — §4: signage, light and services as the entire ornamental language.
- [x] **Visible technology** — §4: antennae, drones, sensor clusters, steerable dishes, vents.
- [x] **The era's signature move** — §1: the emissive edge and retrofit, with the animated display
      as the tally's descendant.
- [x] **The three construction stages** (`site`, `construction`, `built`) — §6: the retrofit.
- [x] **The props kit** — §7.
- [x] **The subtitle row** — ratified above, seven proper nouns, ready to wire.
- [x] **The advisor** — above: **Oru dressed and spoken as a signal engineer**, with the four poses,
  the place in the palette and this era's register. *(Re-recorded 2026-07-30 under `D-ET9`, which
  retired the name `Wren`. Still complete: the dressing and the register are what this item was ever
  ticking off.)*
- [x] **Lesson framings** — above, all nine nodes, with the era's context palette.
- [x] **The era's ROAD design** — closed below.

**Closed on 2026-07-29, and how.**

- **Roads: single surface, markings in the texture — and this era is why the rule exists.**
  Largest island plus the era most likely to want lit, layered markings is exactly the case §5.1
  anticipates. **Era seven settled it for all four late eras** and this era takes it without an
  exception: one surface, with the lit markings, the kerb line and the deck edge read as material
  and emissive-texture changes within it rather than as slabs stacked on it. The recommendation
  constraint 1 already pointed at is now the decision.
- **The workshop chain does NOT get repaired here.** Era nine broke it — a sealed clean room
  cannot have an open working floor — and era nine's guide now records that break as final rather
  than as a failure. This era's Fab inherits a broken chain, and it should not attempt a canopy or
  a forecourt to patch it. Recorded here because era ten is the last chance anyone would have to
  try, and trying would undo the point.

**Still open, and each for a stated reason.**

- **Emissive surface under a single key light.** Era nine raised it for back-lit signage and a lit
  crown; this era needs lit trim, lit soffits, lit water and an animated display, all as emissive
  surface inside `../../City_Art_Bible.md` §2's three-tone model with no runtime lights.
  Constraint 2 above states the requirement and it is not in doubt. What is in doubt is whether a
  lit edge reads as lit when the face beside it is only tonally shaded, and **that is a looks
  question at a specific zoom that cannot be answered in prose.** Answering it here would be
  guessing at the one decision most likely to change the era's whole appearance. **Owner: Evan, on
  the dev server**, and it is the single most valuable hour anyone could spend on this era.
- **O-14: whether the unbuilt "calculus attack" endgame becomes the final era's trial. CLOSED
  2026-07-29: NO.** Era ten's trial is **the end-of-era trial, exactly like the other nine**
  (D-ERA16: the trial re-skins the checkpoint machinery, mastery unlocks it, passing it advances).
  **The question as asked is not a product-scope decision and does not need one:** it asks whether
  the attack *replaces* this era's trial, and answering "no" leaves whether the attack is ever
  built entirely untouched. **If it is built it sits AFTER era ten as a coda** on the finished
  city, gated on nothing this guide authors; `ENDGAME_ATTACK_SCENE` still carries `built: false`
  and nothing depends on it. **The reason to say no is the era model's own value:** ten chapters
  have one shape, and making the last one structurally different spends that on the chapter fewest
  players reach. **And the climax does have somewhere to happen** — the **vent** and the **deck**,
  the era's civic frontage and the one piece of ground the whole city can stand on, which is where
  a coda on a finished island belongs. Nothing in the era's ordinary architecture changes either
  way, which this guide was right about.

**The subtitle row this guide owed in place of D-ERA9's naming pass is DELIVERED**, ratified above
— one proper-noun dressing per mass, learner-facing copy rather than prose. This sentence survived
the pass that wrote the row and had gone on asking for it. See era design §6.2a and `../README.md`.

---

## Related

- `civic-buildings.md` — the bought types for this era, and the food / livability / happiness
  values this file deliberately does not carry.
- `../README.md` — the ten eras, the two-file convention, and what each guide owes.
- `../era-01-prehistoric/style-guide.md` — §0's nine hard constraints, §6's frozen footprint
  table, and the seven through-lines this guide closes.
- `../../2026-07-27-era-progression-design.md` — §3 the ten eras, §6.1 the six ordinary types,
  §12 the art budget and D-ERA20/21, §5.1 the land and depth constraints, §17 O-14.
- `../../City_Art_Bible.md` — the palette, the three-tone lighting model, the silhouette system,
  and the accessibility rules this guide sits inside.
- `../../../../Game_Visual_Design_Brief.md` — the tone bans (no scarcity, no guilt framing).
- `../../../../Node_Spine_v4.md` — the lesson titles the roster above quotes verbatim.

---

## Image inspiration

Drop reference images straight into this folder. Worth gathering: dense neon signage stacks,
megastructure massing, retrofitted older buildings under new tech, exposed ducting and conduit,
rain-wet reflective surfaces, and elevated transit.

> **AMENDED 2026-08-01 — *"rotating radar and comms dishes"* is struck from the list above.** §4
> rules that a dish on the ground is **the prop that would undo `TRG.1`'s re-author** into the
> Neon Plaza, and an inspiration list is where a struck prop comes back: it is read by whoever
> gathers reference, before they reach §4. **The era's aerials are still worth gathering** — the
> drum antennas at two levels on `TRG.4`'s and `TRG.6`'s masts, and Drone Command's corner mast
> with its sensor and antenna clusters — so the subject is not removed, only the form of it this
> era no longer draws.
