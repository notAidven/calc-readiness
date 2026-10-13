# Era 10 — Cyberpunk Era building briefs

Image-generation briefs for the fourteen buildings era ten owes: **nine skill buildings**, **the
hub**, and **four civic buildings**. Written with the `era-building-briefs` project skill from the
era's own two documents, and from nothing else:

- `docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md`
- `docs/superpowers/specs/eras/era-10-cyberpunk/civic-buildings.md`
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0, for the hard constraints
  every era inherits

**Eras one through nine are not briefed here and are not owed.** Since the 2026-07-29 re-dressing
ruling a skill building is drawn once and keeps that look for the whole run, so no later era
re-dresses an earlier one's buildings. Era ten's guide describes the seven masses it **inherits**
under a REFERENCE ONLY banner; none of those seven is drawn here. The only building that rethemes
every era is the hub.

**But an era-ten city has all nine earlier eras standing on it**, which is why the confusion sets
below reach outside this era and reach further than any earlier brief's. Fifty-three skill
buildings from eras one to nine stand when era ten's nine go up, each in its own era's clothes,
plus up to thirty-six civic purchases. **This is the deepest the confusion set ever gets, because
there is no era eleven.** See **The cumulative confusion set**.

---

## Verified at the tip before writing

Researched at **`b2fd03d`** and finished at **`bc27f02`**, which is where `integration` had moved by
the time this was written. Every name below comes from the files at run time, and every claim in
this section was checked against the source rather than carried in. **One PR landed in between and
it changes nothing here** — the measurement is under *The cumulative confusion set*: era ten's two
documents, `ERA_SEQUENCE`, `NODE_FOOTPRINTS`, `buildingAssets.ts`, `eraDressing.ts` and `biome.json`
are byte-identical across the two SHAs.

| What | Found |
| --- | --- |
| **The node set** | `ERA_SEQUENCE`'s `cyberpunk` entry holds `["TRG.1" … "TRG.9"]`, nine ids in order (`packages/skill-graph/src/eras.ts`). The guide's roster is the same nine in the same order. **No disagreement.** |
| **Footprints** | **All nine of era ten's nodes resolve to `DEFAULT_FOOTPRINT` 2×2.** `NODE_FOOTPRINTS` in `apps/web/src/city/worldLayout.ts` holds only the six `NUM.*` ids and `town-hall`, so `footprintFor` falls through for every `TRG.*`. The guide's roster section says exactly this. **The hub is 3×2.** Civic plots are the catalogue's: 1×1, 1×1, 3×2, 2×2. |
| **The ceiling** | `MAX_BUILD_HEIGHT = GRID_CELL * 6` = 24 world units, and it **caps by silently squashing** rather than granting. Not a target. |
| **Stable names** | `D1_NODE_BUILDINGS` in `apps/web/src/city/buildingAssets.ts` — `hall` **Assembly Hall**, `store` **Store**, `dwelling` **Dwellings**, `workshop` **Workshop**, `yard` **Commons**, `tower` **Tower**, hub **Civic Center**. These are what precede every subtitle in the announced name. |
| **The announced name** | `buildingDisplayName` composes `` `${stable}, ${subtitle}` `` (`apps/web/src/city/eraDressing.ts:199`), or the stable name alone when no subtitle is wired. |
| **The subtitle row** | Ratified in the guide, **not wired**. `ERA_DRESSINGS` holds one era key, `prehistoric`. Era ten degrades to the stable name alone today, which is the designed behaviour. |
| **The dominance sweep** | `test/eraCivicCatalogueDominance.test.ts` exists and **carries no exceptions list and no exceptions machinery** — its own header says the era-ten exception was removed and that a floor now sits where the list was. The era-ten pair is swept with no hole. |
| **The trap class** | **CLEAN, and measured rather than assumed.** See below. |

### The known trap class: node ids crossed against their masses — CLEAN

Era two had three of five node ids crossed against their masses; era three had a `store` subtitle
naming its sibling; era five had a store whose doors one section bars and another opens. **Era ten
is one of the two largest rosters in the run** — nine nodes, tied with era eight — so this was
budgeted for and read exhaustively.

**Sixty-six node-id occurrences across the two files** were read against each other: the head
banner's shared-mass list, the roster table, §5's masses section, the subtitle row's cells, the
subtitle row's prose, the `TRG.8` correction banner, and the lesson-framing table. **Every one
agrees**: `TRG.1` `yard`, `TRG.2` `workshop`, `TRG.3` `hall`, `TRG.4` `tower`, `TRG.5` `store`,
`TRG.6` `tower`, `TRG.7` `workshop`, `TRG.8` `hall`, `TRG.9` `dwelling`, with the same building
attached each time. **No node id is crossed against a mass anywhere in era ten.** Recorded because a
clean result is the finding when the check is the point.

**Three corrections the guide says it made are confirmed landed.** §5 records that three roster rows
*"described the roster building in the chain's own words"* and were corrected in place. All three
corrections are in the roster table at this tip: `TRG.5`'s data store now reads *"no windows at all
and no signage either"* against the chain's advertising front; `TRG.7`'s reads *"one storey of dark
glass … no display anywhere on it"* against the chain's two storeys with a display; and `TRG.1`'s
reads *"fixed dishes bolted down on a fenced pad … nothing growing on it"* against the chain's
steerable dishes and planting. *(That was the state at `bc27f02`. `TRG.1` has since been
**re-authored as the Neon Plaza**, 2026-07-30, so its row no longer describes a yard of any kind and
its separation from the chain is equipment against people — brief #1 carries the new form.)*

**The disagreements era ten does carry are of a different class** — a subtitle naming a different
building from its roster node, a height ranking about buildings that are never drawn, and a
withdrawn claim restated as live prose. All are under **Defects reported, not fixed**.

### The roster, as the files give it

> **The `Dressing` column is at the POST-PASS state and the `What the guide authors` column is
> deliberately not.** Every dressing below is now live in the files. **`TRG.2` and `TRG.9` are the
> two whose FORM changed as well**, so their *authors* cells describe the fab shop and the capsule
> stack the files held before the pass — kept because the rest of this document reasons from them,
> and superseded by *Two form changes* above and by the guide's §5.

| Node | Mass | Plot | What the guide authors | Dressing in the files |
| --- | --- | --- | --- | --- |
| `TRG.1` | `yard` | 2×2 | **RE-AUTHORED 2026-07-30 — the Neon Plaza**: an open square of unfenced deck with nothing standing on it; a two-riser terrace, a long bench-step, a cantilevered lip with a rail, an emissive line in every nosing, and people. *(Was: "a dish yard: fixed dishes bolted down on a fenced pad, cable trays running between them, nothing growing on it.")* | **the Neon Plaza** |
| `TRG.2` | `workshop` | 2×2 | A fab shop, windowless clad box with an airlock and an exhaust stack, signage across the parapet — **superseded; the FORM changed** | **Drone Command** |
| `TRG.3` | `hall` | 2×2 | A broadcast hall: a wide clad shed with a glazed control gallery along one face | **the Hologram Theatre** |
| `TRG.4` | `tower` | 2×2 | A comms tower, lattice mast rising from a clad equipment podium, drum antennas at two levels | **the Signal Tower** |
| `TRG.5` | `store` | 2×2 | A data store: a blank monolith with a louvred plant band, no windows at all and no signage either, one service door and a hazard plate | **the Data Vault** |
| `TRG.6` | `tower` | 2×2 | A second, slimmer mast on a retrofitted older roof, guyed, with a lit hazard beacon | **the Broadcast Tower** |
| `TRG.7` | `workshop` | 2×2 | A test annexe: one storey of dark glass on a bracketed frame straddling an older roof, an open rooftop antenna deck, no display anywhere on it | **the Robotics Lab** |
| `TRG.8` | `hall` | 2×2 | An exchange hall: one deep trading floor, new-built on the deck and cantilevered out over the older street below, seamed dark composite panel with its fixings visible, a lit reveal the whole length of the soffit, bracketed cable risers in the open, an animated board facing the deck | **the Stock Exchange** |
| `TRG.9` | `dwelling` | 2×2 | A capsule stack: stacked living modules in a structural rack, walkway galleries on the outer face — **superseded; the FORM changed** | **the Quantum Core** |
| — | `town-hall` | 3×2 | The vent: a lit plant stack rising through the deck, exhaling steam through gratings at its foot, people gathering at the warm grating because it is the only warm place on a cold deck | **the Steam Vent** |

**The four civics, as the catalogue gives them.** Anchors at ×512; illustrative, not shipping
numbers.

| Building | Footprint | Provides | Cost | Role |
| --- | --- | --- | --- | --- |
| **The Vertical Farm** | 1×1 | food for ~10,240 **+ 2,560 happiness** | 40,960 data | food |
| **The Pod Apartments** | 1×1 | 10,240 livability | **35,840 data** | livability |
| **The Night Market** | 3×2 | 10,240 happiness | 46,080 data | happiness |
| **The Nightclub** | 2×2 | 5,120 livability + 5,120 happiness | 61,440 data | blend |

---

## The names: every one as the files give it, beside the settled final name

**None of the renames below is in the files, and none is applied to the era documents by this PR.**
Renames are batched into one consolidated pass and another worker is in the era folders, so this
> ## ✅ EVERY NAME BELOW IS MERGED, and one entry in the lineage this document records has changed
>
> **The consolidated pass has landed** and `docs/superpowers/specs/eras/era-10-cyberpunk/` now reads
> the names in the table below, **including both form changes** — which the guide quotes from **this**
> document, since this is where they were authored. **The Nightclub is also reinstated** as the civic
> blend row: the *Night Market* collision is accepted, and the lead required instead that the two
> **separate visually**. `civic-buildings.md` carries the axis — open covered ground on the deck
> against one enclosed room under it, entered by descending — stated on both buildings' entries, and
> the reinstated club is re-authored so its livability is the same room as its happiness rather than a
> back half bolted on, which was the objection that reverted it last time.
>
> ## ⛑ ONE CORRECTION TO THE DEFENCE LINEAGE THIS DOCUMENT RECORDS
>
> It gives the line as *"era three's Stronghold, era four's Barracks, era six's Cannon Tower, era
> seven's Cannon Factory, **era eight's Missile Silo**, era nine's Air Force Base, era ten's Drone
> Command."* **Era eight's entry is the Nuclear Weapons Facility**; *Missile Silo* was superseded and
> never applied. Every other entry is exactly right, and **all seven are now in the files** — which
> the sentence *"those seven are pending and none of them is in the files at this tip"* no longer
> describes.

document used each final name flagged as **PENDING, NOT MERGED**, with the current file name beside
it, exactly as the skill's Step 3 requires. **This PR contains one new file and touches no era
document.**

| The files said, before the pass | **FINAL name (now merged)** | What it is | Kind of change |
| --- | --- | --- | --- |
| the Deck | **the Neon Plaza** | `TRG.1`, `yard` | rename — **and since 2026-07-30 a form change too** |
| the Chip Plant | **Drone Command** | `TRG.2`, `workshop` | **form change** |
| the Broadcast Studio | **the Hologram Theatre** | `TRG.3`, `hall` | rename |
| the Mast | **the Signal Tower** | `TRG.4`, `tower` | rename |
| the Vault | **the Data Vault** | `TRG.5`, `store` | rename |
| the Rooftop Mast | **the Broadcast Tower** | `TRG.6`, `tower` | rename |
| the Rooftop Lab | **the Robotics Lab** | `TRG.7`, `workshop` | rename |
| the Stock Exchange | *(unchanged)* | `TRG.8`, `hall` | — |
| the Module Stack | **the Quantum Core** | `TRG.9`, `dwelling` | **form change** |
| the Steam Vent | *(unchanged)* | hub, `town-hall` | — |
| The Capsule Homes | **The Pod Apartments** | civic, livability | rename |
| The Vertical Farm | *(unchanged)* | civic, food | — |
| The Night Market | *(unchanged)* | civic, happiness | — |
| The Reservoir | **The Nightclub** | civic, blend | **building change** |

**Two names are dead and appear nowhere in this document: *Drone Garage* and *Stacked
Apartments*.** Each was an intermediate step in a chain and neither survives. If either turns up in
a note, a branch or an older draft, it is superseded.

### The announcement strings, since a subtitle is always heard after its handle

`buildingDisplayName` says `` `${stable}, ${subtitle}` ``, so these are what a screen reader
announces once the row is wired.

| Node | Announced as |
| --- | --- |
| `TRG.1` | **Commons, the Neon Plaza** |
| `TRG.2` | **Workshop, Drone Command** |
| `TRG.3` | **Assembly Hall, the Hologram Theatre** |
| `TRG.4` | **Tower, the Signal Tower** |
| `TRG.5` | **Store, the Data Vault** |
| `TRG.6` | **Tower, the Broadcast Tower** |
| `TRG.7` | **Workshop, the Robotics Lab** |
| `TRG.8` | **Assembly Hall, the Stock Exchange** |
| `TRG.9` | **Dwellings, the Quantum Core** |
| hub | **Civic Center, the Steam Vent** |

**`Dwellings, the Quantum Core` is reported as information and is not treated here as a defect.**
The lead was shown that this string contradicts itself in the accessible name and **ruled to accept
it**: the handle is a screen-reader detail and the visible name is what matters. No substitute is
proposed and the point is not reopened. It is recorded only because an artist reading the brief
should know the handle says *Dwellings* over a building that houses a machine, and should not
try to put a dwelling back into the form to make the string true.

**Three further observations on the strings, offered as information rather than as objections.**

- **`Tower, the Signal Tower` and `Tower, the Broadcast Tower` repeat the mass handle back at the
  learner, twice in one era.** That is the exact defect for which era eight's hub was renamed on
  2026-07-29 — it announced *"Civic Center, the Civic Centre"*, and `eras/README.md` records that
  it *"was the **mass handle repeated back at the learner**, which is the same defect as the four
  hubs the wide pass renamed."* Era ten's `tower` column now does it in both cells. Reported, not
  fixed, and it changes nothing about how either building is drawn.
- **`Drone Command` is the only subtitle in the run with no leading article.** Every other cell in
  the ten-era table reads *the …*. The one-namespace check strips a leading *the* before comparing,
  so this affects nothing mechanically; it is a register difference an artist may notice and should
  not try to correct.
- **`Theatre` is British and the stable hub name `Civic Center` is American.** Era nine's brief
  logged the identical inconsistency for *Data Centre* against *Civic Center*. Cosmetic, and it is
  in the announced name.

### The one-namespace position of the seven new names

**The rule, since the re-dressing ruling:** every name in the game must be unique across the whole
run — all 62 subtitles and all ~40 civic names in one list, currently **121 names, zero
duplicates** (`eras/README.md`). **None of the seven new names collides exactly**, so the property
holds. Four near neighbours are worth stating, and the last one is a live ruling rather than a
matter of taste.

1. **`the Data Vault` beside era nine's `the Data Centre`.** Adjacent eras, both permanent, both
   standing on an era-ten island, sharing the qualifier *Data*. This is the same shape the folder
   rejected in the other direction when era nine's pending *Chip Factory* was weighed against era
   ten's *Drone Command* — *"an identical qualifier under a synonymous head noun."* Here the head
   nouns, *Vault* and *Centre*, are not synonymous, so it is weaker than that case and it clears the
   check. **Reported because the two buildings are also both blank windowless boxes**, which is
   handled in `the Data Vault`'s confusion set below.
2. **`the Hologram Theatre` beside era six's `Lecture Theatre`, on the same mass.** Both are `hall`
   dressings, both permanent. The folder's rule is that *a repeated head noun is not the defect,
   synonymous qualifiers are*, and *hologram* against *lecture* is as unsynonymous as a pair gets.
   **It clears.** A domed Renaissance hall with raked semicircular seating and a dark composite
   shed do not meet anywhere in the art either.
3. **`the Robotics Lab` keeps era nine's rejection of *Research Lab* intact.** Era nine's merged
   brief rejected that rename partly because *"Era ten's `workshop` also holds **the Rooftop Lab**,
   so *Lab* is spoken for one era along."* Under the rename era ten's `workshop` holds **the
   Robotics Lab**, so it is still spoken for and era nine's reasoning survives the change
   unaltered. No action needed; recorded so nobody re-derives it.
4. **`The Pod Apartments` walks into a ruling that was made to keep *Apartment* out of this
   column.** The Condominium's rename banner in era nine enumerates the words that were unavailable
   to it: *"the word had to go entirely — which also rules out **Apartment** …"* — and the stated
   reason is that **era eight's bought housing is The Apartment Tower**, frozen in era eight and
   standing in the same city forever. *The Pod Apartments* is a second *Apartment* in the bought
   column, and `eras/README.md` records the outcome of that pass as *"**Apartment Tower is now the
   only *Tower* in the bought column**."* **Reported, not fixed, and not re-litigated** — the name
   is settled and this document uses it. It is flagged because it is a decision someone made on
   record, in the opposite direction, and whoever runs the consolidated rename pass should know it
   is being reversed rather than merely extended.

**On the `tower` column specifically.** With era ten's two names applied, the ten-era `tower` row
reads *Lookout · Stone Tower · Stronghold · Lighthouse · Tower House · Bell Tower · Water Tower ·
Cooling Tower · Office Tower · **Signal Tower** · **Broadcast Tower***. That is **eight of eleven
names ending in the word *Tower***, up from six. The lead approved this column *"almost entire"*
on the grounds that *"every one of those names a specific thing that only exists in its own era"*,
and *signal* and *broadcast* are era-locked in exactly that way, so both pass the stated test. The
count is offered because the column is the one the lead reads top to bottom.

---

## Two form changes, and they are not renames

**Drone Command** and **the Quantum Core** each replace one building with a different building. A
chip plant is a fabrication facility and a drone command is a military control post; a module stack
is stacked living capsules and a quantum core is a machine in a controlled enclosure. Neither can
be drawn by relabelling the form the files author.

**The precedent, and the method it sets.** Era two's `yard` is the one entry in the ten-era table
whose **building** moved rather than its name: `RAD.2` was a threshing circle and is now an animal
enclosure, and `eras/README.md` records that *"the era's footprint was frozen and did not move with
it."* So the order is fixed: **establish the mass and the frozen footprint first, then author the
new form inside that plot.** Neither change below moves a cell.

### Drone Command — the mass and the plot first

**Mass `workshop`. Plot 2×2 (8×8u)**, because `TRG.2` is not in `NODE_FOOTPRINTS` and
`footprintFor` returns `DEFAULT_FOOTPRINT`. **§5's sentence *"the workshop has a single tile"* is
about `NUM.3` and must not be designed to** — see Defect 1. The plot does not change and is not
being asked to; what changes is what stands on it.

**The new form, quoted for the artist:**

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

**Why this reads as the end of a lineage rather than as an isolated idea.** Drone Command is era
ten's entry in a defence lineage the lead is adding, one building per era from era three onward —
era three's Stronghold, era four's Barracks, era six's Cannon Tower, era seven's Cannon Factory,
era eight's Nuclear Weapons Facility, era nine's Air Force Base, era ten's Drone Command. *(This read
**era eight's Missile Silo**; that name was superseded and the lead's final one is the Nuclear
Weapons Facility. **Era five's The Castle has since been named as the line's era-five entry** — the one
civic in it, bought rather than earned — so the line is eight buildings, not seven.)* **All seven were pending and none was in the files when this was written; all
seven are in the files now**, so nothing above was read from a document
and nothing below is a citation. What the lineage asks of era ten's entry, and what the form
delivers: the line runs from *a wall you stand behind* to *a machine you send out*, and it has been
losing its people the whole way. Drone Command is where nobody goes at all — the sealed ground
floor, the single armoured door, the one canted gallery, and a roof full of vehicles that fly
themselves. **Draw the ground as shut and the roof as busy, and the building reads as the last
entry in that line without a single reference to any earlier one.**

**What the form deliberately keeps from the row it replaces, so the guide's own separation
survives.** §5 keeps three `workshop`-mass buildings apart as *"glass over a base, glass straddling
a roof, and no glass at all"* and calls `TRG.2` *"the third building on this mass … it is the era
nine clean room again."* A drone command is **still the one with almost no glass**: one canted
band, and the rest of the elevation blind. The three-way separation holds unchanged, and it is now
*better*, because a blast wall and a clean-room wall do not look alike.

### The Quantum Core — the mass and the plot first

**Mass `dwelling`. Plot 2×2 (8×8u)**, by the same route — `TRG.9` is not in `NODE_FOOTPRINTS`.
This is the one plot where the guide and the code agree by accident as well as by rule: era one's
table gives the `dwelling` **the square full plot**, and `DEFAULT_FOOTPRINT` is also 2×2, so the
two readings coincide and there is nothing to disambiguate.

**The new form, quoted for the artist:**

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

**The isolation is the whole building and it has to read.** A quantum core is a machine that fails
if anything touches it — vibration, heat, light, air — so every decision above is that one idea:
lifted off the ground, sealed on every face, its plant on the outside because it may not be inside,
and one window that exists so an inspector can look without entering. **If it reads as a plant room
the building is gone.** The band of air under it is the cheapest and most legible carrier of that
and it must survive at full zoom-out.

**It changes the `dwelling` mass's meaning in this era, and that is reported rather than argued
away.** §5's through-line for the mass is *several small dwellings, one shared yard*, and §5 says
the **inherited** instance is the one that carries the chain and *"must keep the void."* Under the
re-dressing ruling that inherited instance wears **era one's** clothes and is the Hut Cluster, so
nothing drawn in era ten carries the dwelling chain either way. The form change therefore breaks
nothing that was going to be drawn — but it does mean **era ten draws no skill housing at all.**

### Does the Quantum Core leave era ten short of housing?

**Mechanically, no, and the reason is the resource model rather than a judgement call.** Both era
documents record the 2026-07-29 ruling that **there is no generation economy**: no building
produces, and a skill building's only credit was ever the one-time lump paid for completing its
lesson. Livability comes from the **civic** rows. Removing a skill dwelling therefore costs the
city nothing it could have counted, and era ten's livability sits exactly where the other nine
eras' sits — on the bought housing row, which is housing in every single era of the run.

**Visually, no, and this is the stronger answer: the form is not lost, it moves.** The civic
livability entry authors *"a structural rack holding stacked living modules, each a lit rectangle
with a small window, open walkway galleries on the outer face, exposed services running up one
side, signage layered over everything."* **That is `TRG.9`'s authored form, almost word for word.**
So the capsule stack still gets drawn in era ten; it is drawn as The Pod Apartments, at 1×1 and at
the top of the era's height band. **The change also removes a real within-era duplicate** — before
it, era ten held two capsule racks with walkway galleries on one island, one skill and one civic,
and the era's own naming record already had to reason about *the Stacks* sitting *"against the
civic Capsule Homes."* That pair is now gone for free — and gone twice over, since the civic row is
now **The Pod Apartments**.

**What era ten does lose, stated plainly, because it is not nothing.**

- **The run's closing statement about housing.** The built housing lineage is eras one, five, six,
  eight and nine — **five buildings, not nine** — and era ten was going to be the sixth and last.
  With `TRG.9` re-formed, the last skill dwelling anyone draws is era nine's Glass Apartments, and the
  final word on how this city houses people is a bought 1×1 tower the catalogue itself calls
  *"deliberately the least dignified housing in the game."* That is a real loss of a closing note
  and it is worth someone deciding they are content with it.
- **The second tallest thing in the era, and the top of §3's ranking.** §3 places the capsule stack
  *"second only to the comms tower, so the housing ends the run as the tallest inhabited thing in
  the city."* An isolation hall is low and broad. §3's ranking already needed re-reading for other
  reasons (Defect 3); this moves its second entry to the bottom half.
- **The lit void.** §5's *"shared yard reduced to a lit void in the middle of the rack"* is the
  dwelling chain's last link, and it belonged to the inherited instance, which is never drawn. It
  was already lost before this change and this change is not what costs it.

**Verdict: not short.** The livability is untouched, the capsule form is still drawn on the civic
row, and the era gains a distinctness it did not have. The cost is a narrative one, on the closing
statement rather than on the city.

---

## Three rulings, confirmed and not reopened

### 1. A dressing name may disagree with its mass handle — accepted

Handled above under the announcement strings. **`Dwellings, the Quantum Core` is reported as
information, is not treated as a defect, and no substitute is proposed.**

### 2. The Nightclub stands, and the Night Market collision is accepted

**The lead's words were that he is "ok with the night market subconflict", and this document does
not re-litigate it.** What follows is the other half of the ruling's consequence, which does need
answering: **a market and a club are genuinely different buildings, and they now have to carry that
difference without any help from their names.** Six axes separate them, none of them geometry, and
every one survives full zoom-out.

| | **The Night Market** *(3×2, happiness)* | **The Nightclub** *(2×2, blend)* |
| --- | --- | --- |
| **Enclosure** | **No walls at all.** A tensile fabric canopy on poles over stalls; you can see under it and through it from every azimuth | **A sealed mass with one door.** A blank slab of seamed dark composite panel, shut on every face but the entrance |
| **Plan** | **Six cells of mostly ground.** The building is the roof; the plot is a floor | **Four cells of mostly building.** The plot is the building's own footprint |
| **Where the light is** | **Many small sources, dispersed.** Layered neon and hanging signage over every stall, spread across the whole canopy | **One large lit plane.** A single projecting blade sign and a lit soffit line at the entrance, and nothing else lit anywhere |
| **Steam** | **Cooking smoke and steam rising through the canopy**, across the whole area, at head height | **Ventilation cowls on the roof only.** Nothing at ground, and nothing at the frontage |
| **People** | **Seated and scattered** at low tables all over the floor | **Standing in one line** along one edge, at the rail |
| **Height and top edge** | A **sagging fabric canopy** at ~8 units, curved and slack | **The lowest building in the era**, flat-topped and hard-edged, most of its bulk low against the deck |

**Open canopy against closed slab is the axis to protect**, because it is the one that holds when
the camera is furthest out and both buildings are a few pixels of dark on a lit deck: one is a
translucent lid over visible activity and the other is a solid block with a queue against it.

### 3. The blend row is always the shared amenity — confirmed from the ten files

**Confirmed from the ten `civic-buildings.md` files rather than taken on trust.** Every era's
fourth civic is the blend, and across the ten it is always the small shared amenity the whole
settlement uses:

| Era | Blend building | Plot |
| --- | --- | --- |
| 1 | **The Spring** | 1×1 |
| 2 | **The Village Well** | 1×1 |
| 3 | **The Trading Post** | 1×1 |
| 4 | **The Fountain** | 1×1 |
| 5 | **The Chapel** | 1×1 |
| 6 | **The Painters' School** | 1×2 |
| 7 | **The Library** | 1×1 |
| 8 | **The Fire Station** | 2×1 |
| 9 | **The Hospital** | 1×2 |
| 10 | **The Reservoir** → **The Nightclub** *(applied: the row is The Nightclub)* | 2×2 |

**The pattern holds and `eras/README.md` states the mechanism rather than the habit:** the blend is
the only row carrying **both** capacities and it is always the era's smallest plot, so *"a building
that is tiny and yet worth two dials has to be something the whole settlement shares."* Five of the
first nine are literally water — Spring, Village Well, Fountain, and the Chapel with its well
against the side wall, with the Reservoir having been the fifth on the era-ten row.

**A nightclub satisfies the family; it is simply not water.** It is a place the whole settlement
goes, it is small, it is shared, and in a city of capsules it is the one interior anybody is in
together. **The Nightclub replaced a Quantum Core on this row after the water-lineage argument was
put to the lead**, so the argument was heard and answered, and it is stated here once and then
left. What the loss of water does cost is the run's neatest closing rhyme — era one's Spring was
found and era ten's Reservoir would have been built, buried and free — and **that rhyme is gone,
which is a real price and not a defect.**

**One consequence the art has to absorb.** The era-ten file's own objection to the previous
Nightclub was that it *"had to argue its own livability into existence"* from a back half bolted on
behind it. That objection is not answered by a name, so **this brief authors the livability into
the frontage rather than behind the building**: free water points and heated seating set into the
club's own street edge under the overhang, lit from the soffit, used without paying, open when
everything else is shut. It is the same amenity the column has carried for ten eras, and it is on
the side of the building the camera can see.

---

## The theme brief

*Read once. Every building below inherits all of it, and none of them restates it.*

Era ten is **a lit deck built on top of everything that came before, with nothing removed.** The
signature move is **the emissive edge, and retrofit as a way of building.** Light is used as
*trim* — a line along a parapet, a strip under a soffit, a glowing reveal round a window, a lit
seam where two panels meet — and it is never there to illuminate anything, which is exactly what
makes it ornament rather than lighting. The second half of the move is structural: this era does
not build on cleared ground, it builds **on and around what is already standing**, so a new frame
straddles an older roof and a deck runs over an older street. Both halves suit the one era with
nowhere left to go — the island is full, the only directions are up, over and onto the existing
fabric, and the only surface left unused is the surface of light. **Four materials, and the fourth
has never been available before.** **Dark composite panel** is the body: near-black, matte,
rainscreen panels with an expressed joint and visible fixings, and the seams are meant to be
counted — the deliberate opposite of era nine's flush skin. **Dark and switchable glass** is tinted
almost to opacity, so glazing reads as a darker panel with a sheen rather than as a hole, with one
or two lighter switched patches per elevation that should look deliberate rather than accidental.
**Exposed conduit, cable tray and ducting** run openly across faces, round corners and up parapets,
bracketed off the panel — this is the era's texture and it wants to look accumulated rather than
designed. And **emissive signage** is a **material rather than a fitting**: lit letters, lit bands,
lit edges, treated as surface. **Nothing is being withheld for a later era, because there is no era
eleven, so the absences are a closing ledger of what has left the island for good:** thatch after
era two, the timber frame on the outside of a wall after era five, lime mortar and dressed ashlar
as a wall after era six, brick as mass and cast iron after era seven, soil as the walking surface
after era eight, and daylight as the only light source after era nine — and every one of those
materials is still findable somewhere on the island, doing a different job. **Buildings stand on
other buildings.** The frame is still a frame, but it lands on a deck, a podium or the roof of
something older, and the joint between the new and the kept is expressed rather than concealed: the
**deck and the layer**, so most buildings have two or three plausible ground floors and no single
base; **retrofit**, a new structure straddling older fabric with that older fabric visible through
and under it; **the rack**, a structural frame holding units clearly separate from it, where the
frame is the architecture and the modules are the infill; **expressed services**, which is era
nine's rule inverted on purpose; **the cantilever over the void**, so an edge is an overhang and a
rail rather than a wall meeting ground; and **lit soffits and gratings**, because in a layered town
the underside of things is as visible as the top. **Ornament level is high, for the first time
since the Renaissance, and none of it is architecture** — signage, light and services do all of it,
so a face is patterned by cable trays and panel seams, punctuated by lit letters and topped by an
animated display, while the massing underneath is as plain as era eight's: **an ordinary dark box
with an extraordinary amount attached to it.** Signage is the era's entire identification system
and it is **stacked** — plates, boxes, projecting blades and lit bands accumulating on one frontage
at several sizes and several ages, some dead and some flickering, because old signs are not removed
when new ones arrive and the stack is a history, which is the habit this era also applies to
buildings. **One body hue for the whole era — dark composite panel `#4A4E58`, the darkest body in
the run — with emissive cyan `#5FD0D8` as the accent and magenta held in reserve**, sitting on the
calm parchment ground `#ECE4D3` rather than competing with it; the body is dark precisely so the
accent has something to sit against, because a neon palette on a pale body reads as washed out.
Buildings share the body hue and differ by silhouette plus accent, never by a second body colour.
The era's tally descendant is **the animated display** — a scrolling figure, a bar that climbs and
resets, a panel cycling through numbers — which is one step past era one's prediction and where the
motif stops, since nothing follows to carry it further; it is on buildings everywhere in this town
and **it never shows a building's own lesson.**

### Constraints that bind every image below

**The first one is the era's whole problem and it is stated first for that reason.**

- **EMITTED LIGHT IS AN EMISSIVE SURFACE INSIDE THE MODEL, AND NEVER A LIGHT ADDED TO THE SCENE.**
  A lit sign, a lit parapet line, a lit soffit reveal, a lit hazard beacon, an animated display, a
  grow-light panel, the lit water in the channels: **each is bright in itself and lights nothing
  whatever around it.** No glow, no bloom, no halo, no pool of light on the deck, no coloured cast
  on a neighbouring wall, no reflection of a sign onto anything, no gradient falling off from a lit
  edge, and nothing in any image lit by anything else. **In a neon era this single constraint is
  doing enormous work** and it is the one most likely to be broken by an artist doing their best:
  the instinct on being told *"neon city, wet deck"* is to light the scene, and the answer is that
  era ten has no scene lighting at all and never will. Draw the emissive surface, then stop.
  **The undecided half is a looks question and does not license anything here** — whether a lit
  edge reads as lit beside a face that is only tonally shaded is Evan's, on the dev server, and it
  is the one open item across all ten era folders. **The decided half is not negotiable and is
  stated above.**
- **Era ten's light arrives after era eight drew none at all.** Era eight's §2 lists *"emissive
  surface of any kind"* among its **explicitly absent** materials, reserved for this era, which is
  why its Cooling Tower's steam and its Heating Plant's plume are geometry and tone only. **Era
  ten's light should therefore read as an event.** *(Era nine is not part of that absence and the
  brief should not pretend it is: era nine carries back-lit signage bands, `EL.2`'s lit crown and
  lit display panels, and forbids only emissive used as a **whole face**. See Defect 6 — era ten's
  §2 claim to be the first material in the run that emits is true of materials tables and not of
  surfaces.)* **Emissive stays small in era ten too:** signage, conduit runs, window edges, parapet
  lines, soffit reveals. **Never a whole face.**
- **Three tone steps per surface under one key light** — top face lightened, the hue on the left,
  the right darkened. **No runtime lights**: no cast shadow, no ambient occlusion, no specular
  highlight, no rim light, no gradient. Never describe or draw a building by the light falling on
  it. **The wet deck is a material read, not a lighting one**: reflective dark resin and perforated
  metal, flat and tonal, never a mirrored gradient.
- **Mastery gold `#FFB703` is reserved and a neon palette will reach for it.** It may never be a
  material and a body is never gold — **and an emissive gold sign or trim is out as well**,
  because the reservation is about the hue rather than about the surface. Cyan and magenta exist in
  this palette precisely so that nothing has to go near it.
- **Footprints are frozen** (INV-ERA-1). Design to the plot named in each brief and never change
  which cells a building occupies. **All nine skill plots are 2×2**, the hub is 3×2, and the civic
  plots are 1×1, 1×1, 3×2 and 2×2.
- **Height is a ranking, never a world-unit target.** A model is contain-fit to its plot by one
  uniform scale, so the more slender of two neighbours is simply the taller one, and a smaller plot
  shrinks a model whole rather than making it look tall. **Slenderness is a property of the model.**
  The 24-unit ceiling caps by silently squashing and is not something to aim at.
- **Every building is modelled at its finished (`built`) stage** — not the site stage, not
  construction, and not a mastery variant, because mastery rides above a building as stars and
  there is no gilded version.
- **Every side must read.** The camera orbits a full 360° at a locked ~49° tilt, so there is no
  front and no hidden back. **This costs era ten more than it costs any other era**, because the
  era's identification system is a stacked signage frontage and the temptation is to put it all on
  one elevation. Wrap the services; distribute the signs.
- **No rebuses, and this is where D-ERA8 bites hardest in the whole run.** Waves and rotation are
  era ten's mathematical read and **a sine wave along a parapet or a rippling façade is the single
  most tempting rebus anywhere in the ten eras — it would look good, which is what makes it
  dangerous.** A lit band along a parapet is era trim; **a lit band that undulates is a graph.** No
  sine on an elevation, no orbit diagram, no unit circle, no phase offset expressed as a stagger,
  and no animated display showing a building's own subject. A display shows a number that changes.

---

## The fourteen buildings

| # | Building | Class | Node / role | Plot |
| --- | --- | --- | --- | --- |
| 1 | **the Neon Plaza** *(re-authored 2026-07-30; until then a fenced dish yard, and until the pass the files read "the Deck")* | skill | `TRG.1`, `yard` | 2×2 |
| 2 | **Drone Command** *(merged; until the pass the files read "the Chip Plant", and the FORM changes)* | skill | `TRG.2`, `workshop` | 2×2 |
| 3 | **the Hologram Theatre** *(merged; until the pass the files read "the Broadcast Studio")* | skill | `TRG.3`, `hall` | 2×2 |
| 4 | **the Signal Tower** *(merged; until the pass the files read "the Mast")* | skill | `TRG.4`, `tower` | 2×2 |
| 5 | **the Data Vault** *(merged; until the pass the files read "the Vault")* | skill | `TRG.5`, `store` | 2×2 |
| 6 | **the Broadcast Tower** *(merged; until the pass the files read "the Rooftop Mast")* | skill | `TRG.6`, `tower` | 2×2 |
| 7 | **the Robotics Lab** *(merged; until the pass the files read "the Rooftop Lab")* | skill | `TRG.7`, `workshop` | 2×2 |
| 8 | the Stock Exchange | skill | `TRG.8`, `hall` | 2×2 |
| 9 | **the Quantum Core** *(merged; until the pass the files read "the Module Stack", and the FORM changes)* | skill | `TRG.9`, `dwelling` | 2×2 |
| 10 | the Steam Vent | hub | `town-hall` | 3×2 |
| 11 | The Vertical Farm | civic | food | 1×1 |
| 12 | **The Pod Apartments** *(merged; until the pass the files read "The Capsule Homes")* | civic | livability | 1×1 |
| 13 | The Night Market | civic | happiness | 3×2 |
| 14 | **The Nightclub** *(merged; until the pass the files read "The Reservoir", and the BUILDING changes)* | civic | blend | 2×2 |

**All nine skill plots being 2×2 is a fact about the code, not a placeholder.** Era ten is the
second era after era nine in which the plot does none of the differentiating work — no long strip
to make a shed read long, no single tile to make a lab read small. **Aspect ratio has to come from
the models**, and the guide says so: the extremes *"belong to the models rather than to the plots"*,
and the Signal Tower in particular *"should be authored many times taller than it is wide, the most
extreme proportion the game will ever show."* **Do not reach for a plot to fix a proportion**, and
do not read §5's per-mass plot sentences as being about these nine (Defect 1).

### The height order — DERIVED here, because the guide's is about buildings that are not drawn

**§3's ranking cannot be used as written, and this is a finding rather than a nuisance.** Its eight
entries are *the comms tower, the capsule stack, the second slimmer mast, the interchange hall and
the plant stack, the data store and the signal lab, and the dish yard lowest.* **Four of those name
the inherited chain instances** — the comms tower, the interchange hall, the signal lab, and on
§5's own reading the capsule stack — which the re-dressing ruling means are **never drawn**, and
the ranking's *tallest* entry is one of them. Meanwhile `TRG.2`, `TRG.3`, `TRG.7`, `TRG.8` and
`TRG.9` appear nowhere in it. See Defect 3. **The order below is derived from the authored forms
and from §3's relative statements wherever they are about a building era ten actually draws.**

**Skill and hub, tallest first.**

1. **the Signal Tower** (`TRG.4`) — clear of everything else by a wide margin, and the only thing
   in era ten authored as a mast. §3 reserves the 24-unit ceiling for the **inherited** comms
   tower, which is not drawn, so among the drawn set this is the top and it should still not be
   authored *at* the cap.
2. **the Broadcast Tower** (`TRG.6`) — the era's second vertical, and §3 places it third overall
   behind two buildings that are not drawn.
3. **the Steam Vent** (hub) — the plant stack rises through the deck; §3 puts it level with the
   inherited interchange hall, mid-order. **Wide rather than tall**, with the stack doing the
   height.
4. **the Stock Exchange** (`TRG.8`) — a deep floor plate cantilevered over the older street. Big in
   plan and volume; not tall.
5. **the Hologram Theatre** (`TRG.3`) — a wide shed. Low and long.
6. **the Data Vault** (`TRG.5`) — §3: *"then the data store … among the lowest things in the city."*
7. **Drone Command** (`TRG.2`) — a squat hardened block with a populated roof.
8. **the Quantum Core** (`TRG.9`) — low and broad, and **this is where the form change moves it**:
   §3 had the building on this node second in the era.
9. **the Robotics Lab** (`TRG.7`) — one storey. It *sits* high, on an older roof, but the model is
   the shortest roofed thing era ten draws.
10. **the Neon Plaza** (`TRG.1`) — **lowest**, and the lowest plot on the island for the tenth era
    running.

**Civic**, from the catalogue's own figures, used only as the relative order the civic file states:
**The Pod Apartments** (~22 units, *"at the ceiling"*), then **The Vertical Farm** (~21), then
**The Night Market**'s canopy (~8), and **The Nightclub** lowest — *"deliberately the LOWEST
building in the era"*, most of it low against the deck. *Two contradictions are reported under
**Defects** rather than reconciled here: the civic file gives world-unit figures where the style
guide forbids them, and §3's claim that the inherited comms tower is the only thing in the run near
the ceiling does not survive a 22-unit Pod Apartments in its own companion file.*

### Should era ten carry two towers? — an explicit judgement

**First, the premise this was put to the brief with is wrong, and correcting it changes the
answer's setting.** The claim was that the built tower lineage is eras one, two, three, five and
seven, and that era six draws no tower. **Era six draws no tower and neither does era four** — both
carry a `tower` subtitle over a mass their rosters do not occupy — but **eras eight and nine both
do**, and their towers are two of the most conspicuous buildings in the run. Measured from
`ERA_SEQUENCE` and the ten rosters, which are byte-identical at `b2fd03d` and `bc27f02`:

| Era | `tower` node | Built? |
| --- | --- | --- |
| 1 | `NUM.5` | **yes** — the Lookout |
| 2 | `RAD.4` | **yes** — the Stone Tower |
| 3 | `LIN.6` | **yes** — the Stronghold |
| 4 | *(none — roster is `POL.1 POL.2 POL.3 POL.4 POL.8`)* | **no**, though the row says *Lighthouse* |
| 5 | `RAT.4` | **yes** — the Tower House |
| 6 | *(none — roster is `GEO.1 GEO.2 CG.1 POL.6 POL.7 RAT.5`)* | **no**, though the row says *Bell Tower* |
| 7 | `POL.5` | **yes** — the Water Tower |
| 8 | `LF.4` | **yes** — the Cooling Tower |
| 9 | `EL.2` | **yes** — the Office Tower |

**So the true built count before era ten is SEVEN, not five and not nine**, and era ten's two make
**nine towers standing on a finished island.** Era nine's own merged brief briefs its Office Tower
as one of its six, which is independent confirmation from a document already on `integration`.

**The judgement: yes, era ten should carry both — but the second one must stop being a mast.**

**Why both stay.** `TRG.4` and `TRG.6` are both on `tower` in `ERA_SEQUENCE`, and moving a node to
another mass is the expensive option the folder has already refused eleven times: *"The eleven
shared-mass pairs are authored rather than reassigned. No node was moved to a different mass, so no
footprint changed and no era's land budget moved."* The two towers are given, not chosen, and the
real question is whether they can be drawn as two buildings.

**Why the separation the files give is not enough.** §5 says the era's two tower-mass buildings are
*"the same species at lower height"* — one on a broader podium, one *"slimmer, guyed, and on a
retrofitted older roof."* **Slimmer and guyed is a difference of degree between two objects of the
same species**, and degree is the axis this folder repeatedly finds does not survive the camera; it
is the same shape as the *banded against checkered* problem era nine had to solve on its
Condominium. At full zoom-out, two lattice masts of graded height read as one mast drawn twice.
With nine towers standing, **that is the one place era ten can actually make things worse.**

**What the new name licenses, and it costs nothing.** **A broadcast tower is not a comms mast.**
Under *the Broadcast Tower*, `TRG.6` can be authored as a **closed, clad, tapering occupied shaft
with a drum of transmitter galleries at its head**, standing on the retrofitted older roof — and
**closed mass against open lattice** is precisely the axis era eight used to keep its Cooling Tower
apart from its pylon yard and era nine used for its own yard building, described in that era's brief as
*"open frame against closed mass is the era's clearest pair."* It reads at any zoom, where *slimmer
and guyed* does not. **It also takes era ten from three lattice masts to one** — the inherited
comms tower, the Signal Tower and the Broadcast Tower were all lattice — which is worth having on an
island that already holds nine towers.

**So: two towers, yes; two masts, no.** The recommendation is inside brief #6 below and it is the
one substantive art decision this document makes on its own account.

---

### 1. the Neon Plaza — `TRG.1`, `yard` mass

> ## ⚡ RE-AUTHORED 2026-07-30 — DRAW THE PLAZA BELOW, NOT THE DISH YARD
>
> **Defect 2 is CLOSED, and it closed in the direction this brief said was not available to it.**
> The lead has ruled that a fenced equipment yard and a plaza are opposites with no reading that
> reconciles them, so **the building moves to meet the name.** This brief was right to refuse to
> re-design a building to fit a proposed name — *"a brief may not"* — and it was right that the
> mismatch was the most serious disagreement in era ten's documents; **the ruling is what a brief
> was waiting for, and it has arrived.** `era-10-cyberpunk/style-guide.md` §5's `yard` entry carries
> the new form, the emissive constraint and the separations, and the brief below is written from it.
> **Nothing about the plot, the mass or the node moves** — 2×2, `yard`, `TRG.1`.
>
> **The old brief is kept in full underneath**, because it is what was drawn against until today and
> because one of its rules — *nothing on this plot may rise* — survives the change untouched.

**Plot: 2×2 (8×8u).**

**Silhouette.** **A flat, empty, unfenced square of deck with a few lit lines lying across it.**
There is no object on this plot and no boundary round it: what reads at zoom-out is the **absence**
— a gap in a city that is stacked everywhere else — plus the emissive nosings of a two-riser
terrace at one corner, a bench-step down one side, and a rail at the cantilevered lip. **Every one
of those lines is horizontal and parallel to a plot edge.**

**How it stands up.** It barely does, and that is correct. Deck panel over structure, continuous
with the street; on one side the deck **cantilevers past its own structure** and stops at a rail
with no wall under it, which is §3's *"an edge is an overhang and a rail rather than a wall meeting
ground."* **This plot has never once risen in ten eras** — swept earth, threshing floor, weighing
yard, paved court, kitchen garden, parterre, works yard, mown park, dish pads, and now a plaza —
**and it must not start here**: nothing on it goes above the rail.

**Materials and ornament.** Perforated metal deck and dark composite panel underfoot, the same
fabric as the street. **No mesh, no gate, no kerb, no hazard plate.** The only ornament is the
**emissive line in each nosing** — the terrace lip, every tread, the bench-step's front edge and the
underside of the rail. **No signage stack and no animated display**, in an era whose identification
system is stacked signage: the plaza has no frontage to stack it on, and the absence is authored.

**The detail that has to read: the lit nosings, and nothing lit but them.** Hard-edged emissive
strips a few centimetres deep, set into the edge they describe. **The deck panels are dark and stay
dark**, and **no light comes up through them.** Under `City_Art_Bible.md` §2 — one soft key light,
three face tones, no runtime lights — this building must be drawable with the strips switched off
and nothing else changing: **no glow, no bloom, no halo, no falloff painted onto the panel beside a
lit line, no pool of light, nothing on the plot lit by anything else.** A neon plaza is precisely
where an author reaches for a glow, and the answer is **the most lit edges in the era and not one
lit volume.**

**Props.** People — standing at the rail, sitting along the bench-step, crossing — and they are
load-bearing for recognition in the way the trailers were for the old shed at era nine. Service
hatches and perforated panels in the surface. Puddles. Rubbish caught in a grating. **And a long
authored absence: no dish, no mount, no cable tray, no fence, no planter, no drone dock, no stall,
no canopy, no mast.** The emptiness is the building.

**Height.** **The lowest thing era ten draws**, below the Robotics Lab, and now more clearly so than
before — there is not even a dish on a stub. Something has to hold the bottom of the band while a
mast holds the top.

**Per D-ERA8, and this is the sharpest instance in the run.** `TRG.1` hosts **degrees, radians and
coterminal angles**. **No circular centrepiece, no radial paving, no arc, no inscribed circle, no
compass rose, no marks set round anything at intervals, nothing that turns.** A plaza wants a round
middle with joints radiating off it, and that is a protractor drawn at 1:1. The plot is rectangular,
the terrace and the bench-step are straight and parallel to its sides, and the lit lines run one
way.

**What it must not resemble.**

- **The Nightclub (civic), and this is the live one.** That building's whole read at deck level is
  *"the ground glowing rather than a facade"* — a portal, a broad flight of steps going **down**, a
  run of grated slots you see a lit room through, two cowls. **That read is the Nightclub's and must
  stay the Nightclub's.** The plaza's deck is **solid with no opening in it anywhere**, nothing is
  lit beneath it, and its steps go **up** by two risers onto its own terrace.
- **The Night Market (civic).** Covered against uncovered: the market is a tensile canopy on stall
  frames — *"the canopy is the whole of it"* — with hanging signage at head height, and the plaza
  has no canopy, no stall and nothing hanging. **The market's light is over your head and the
  plaza's is under your feet.**
- **The chain's steerable dish yard** *(reference only, never drawn)*: dishes, mounts, trays and
  planting in lit containers against **nothing at all**. Equipment against people.
- **Era nine's Air Force Base (`EL.6`)** — the pair era nine's brief called *"the genuinely
  dangerous one"* — is **dissolved rather than managed**: `TRG.1` no longer has a dish, a pad or a
  fence, so the negotiated tray axis is moot. Era nine's own rule (*"keep every tray on this plot
  below the surface"*) is left alone; it is sound for its own building.
- **Era two's Sheep Pen, era four's Barracks drill ground and six more open grounds standing on the
  island** — the guide's `yard` entry answers each in a table, and the short version is that the
  plaza is the only one of the nine with **no boundary, no object on it and nothing it is used
  for.**

<details>
<summary><strong>The pre-2026-07-30 brief — the fenced dish yard, kept as the record of what was drawn against</strong></summary>

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Deck*.** **And the name names a different
> building from the one its node authors** — see Defect 2, which is the most serious disagreement
> in era ten's documents. **The brief below is the yard the roster authors**, which is the only
> thing that is safe: a brief may not re-design a building to fit a proposed name.

**Plot: 2×2 (8×8u).**

**Silhouette.** **A fenced rectangle of deck with a rank of dishes standing on it and nothing
else.** The dishes are the whole read — concave discs on short bolted mounts, all at one elevation
and one azimuth, reading at zoom-out as a group of ellipses on stubs. Everything else on the plot is
flat.

**How it stands up.** It barely does, and that is correct. Each dish is bolted down on a mount set
into the deck; the fence carries nothing but itself. **This plot has never once risen in ten
eras** — swept earth, threshing floor, weighing yard, paved court, kitchen garden, parterre, works
yard, mown park, dish pads, and now a deck pad — and it must not start here.

**Materials and ornament.** Perforated deck panel and dark composite underfoot, mesh fence,
galvanised mount frames. **Cable trays run in the open between the mounts**, which is the era's
signature and the opposite of era nine's flush-in-the-paving rule. **Nothing planted anywhere** —
the ground is kept clear because the equipment demands it, not because anybody decided to keep it
open, and that distinction is the whole of what separates this from the chain's version of the
mass. A hazard plate on the gate. **No signage stack and no animated display.**

**The detail that has to read: the dishes are bolted down and point one way.** Fixed mounts, no
steering gear, no drive rings, all at one elevation and one azimuth. **A yard of dishes aimed
randomly reads as scrap**, and steerable mounts belong to a building era ten does not draw.

**Props.** Cable trays run at deck level between the mounts. Service hatches and perforated deck
panels in the surface. Puddles, and rubbish caught in a grating at the fence line. A pole-mounted
sensor cluster at one corner. **No planting in lit containers on this plot**, though they are in the
era's kit — the absence is authored.

**Height.** **The lowest thing era ten draws**, below the Robotics Lab. Something has to hold the
bottom of the band while a mast holds the top.

**What it must not resemble.** **Era nine's Air Force Base (`EL.6`), and this is a live pair era
nine's own brief flagged as *"the genuinely dangerous one."*** Both are a fenced plot of dishes on
pads with almost nothing else standing. They separate on **service routing and substance**, and era
nine's brief already conceded the axis: *"Era ten runs its trays in the open as its signature; era
nine's are flush in the paving. Keep every tray on this plot below the surface."* **So era ten's
trays must be conspicuously above the surface**, bracketed and bundled between the mounts, and the
ground must read as perforated deck over structure rather than era nine's precise unit paving on
soil. Secondarily, against **era eight's Power Station** *(the files read* the Substation *until the
consolidated pass, which also re-authored it into a building)* — open lattice frames rising against closed
discs tilted, which is free.

</details>

---

### 2. Drone Command — `TRG.2`, `workshop` mass

> **✅ MERGED, AND IT IS A FORM CHANGE RATHER THAN A RENAME. Until the pass landed the files read *the
> Chip Plant* and author a fab shop.** A chip plant is a fabrication facility; a drone command is a
> military control post. **The mass and the plot are unchanged and the new form is authored inside
> them** — see *Two form changes* above for the full quoted form and the lineage it closes.

**Plot: 2×2 (8×8u).** **Not a single tile** — §5's *"the workshop has a single tile"* is about
`NUM.3` (Defect 1).

**Silhouette.** **A squat blast-walled block, shut at ground and populated on its roof.** One
dominant shape — the hardened box — and one accent, the flat drone deck ringed by a low parapet
with landing cradles across it and a rack of parked drones along one side. **Shut at the bottom,
busy at the top**, and that inversion is the silhouette.

**How it stands up.** The box lands on the deck as a blast wall rather than as a frame with infill:
a thick, battered, unrelieved plane of seamed dark composite panel over a hardened core, with the
panel seams and fixings expressed as everywhere else in the era. The roof deck is a flat slab
carried over it, edged by a parapet. A **single canted operations gallery** of dark switchable
glass is bracketed off one elevation at first-floor level, angled to look out over the deck, and it
is the only thing that projects from the wall.

**Materials and ornament.** Dark composite panel throughout, with the panel gauge visibly heavier
than its neighbours'. Dark switchable glass at the one gallery band and nowhere else. Bracketed
conduit and cable tray climb the blast wall in the open to a corner mast of sensor and antenna
clusters. **The ornament is the absence of ornament:** **no signage stack and no animated display
anywhere on the building**, in an era where signage is the entire identification system. That
absence is the loudest thing about it and it must be preserved.

**The detail that has to read: the drone deck's landing cradles and the rack of parked drones.**
Cradles in a regular rank across the roof, each with an emissive edge strip; drones stowed nose-in
on an open rack along the sheltered side of the parapet. **This is the only thing that says
*command post* rather than *bunker*,** and it is what puts the building at the end of the defence
lineage rather than beside it.

**Props.** A vehicle-scale armoured door with an interlock plate. A deck-edge landing plate at the
plot boundary. Cameras in a corner bracket and a dome. Service hatches in the deck. **No planting,
no seating and no rubbish** — the ground is operational and it is swept.

**Height.** Below the Data Vault and above the Quantum Core. **Deliberately squat**, and against
the era's instinct to make every dark box a monument.

**What it must not resemble.** **Era nine's Chip Factory (`EL.3`), and the form change is what
rescues this pair.** Era nine's brief names era ten's fab shop as *"the same building one era on"*
and *"the sharpest cross-era confusion this building has"*, separating them only on whether the
fixings show. **Under the form change that pair is closed rather than managed**: era nine's is a
sealed laboratory with a projecting airlock snout and a bunded gas store, and era ten's is a
hardened block with a roof full of aircraft. **The airlock and the gas store must not appear on
this building** — they belonged to the fab shop and they are era nine's signature. Within era ten,
against **the Robotics Lab (#7)** on the same mass: one storey of glass straddling an older roof
against a blast wall standing on the deck — glass against no glass, which is §5's own three-way
separation and holds unchanged.

---

### 3. the Hologram Theatre — `TRG.3`, `hall` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Broadcast Studio*.** **Note what the rename
> does inside era ten: the word *Broadcast* moves from the hall to the tower**, since `TRG.6`
> becomes *the Broadcast Tower*. An artist working from an older list will look for the broadcast
> building among the halls and it is now the mast on the roof.

**Plot: 2×2 (8×8u).**

**Silhouette.** **A wide low shed with one long glazed gallery banded across a single face.** One
dominant shape — the clad shed with a flat top edge — and one accent, the horizontal glass band. It
reads long rather than tall, and the band is what stops it being a box.

**How it stands up.** New-built on the deck, and that matters: §5 separates era ten's three
hall-mass buildings by exactly this, with the inherited interchange hall being the one *occupied
from above* and `TRG.3` and `TRG.8` the two that are not. A clear span over one wide undivided
volume, the roof flat behind an upstand, the control gallery carried as a projecting band on
brackets off the long elevation rather than cut into it.

**Materials and ornament.** Dark composite panel over the shed, seams and fixings expressed. Dark
switchable glass across the gallery band — **this is the one building in era ten with a long
continuous run of glass**, and one or two switched-lighter panes in it should look deliberate.
Cable trays run in the open across the elevation and over the parapet. A **stacked signage
frontage** at the entrance end, several sizes and several ages, some dead and some flickering.

**The detail that has to read: the control gallery, occupied.** A continuous horizontal band of
dark glass with **desks, racks and people visible behind it** along its whole length, angled
slightly out. **This is the only building in era ten you can see people working inside**, and it is
what separates a theatre from a store. If the glass reads as a blank darker panel the building is
gone.

**Props.** A stacked signage frontage with projecting blades. An animated display over the
entrance, its count moving. Cable trays and a junction box on the elevation. Planting in lit
containers at the entrance. A parcel locker under a wall cradle.

**Height.** Below the Stock Exchange and above the Data Vault. **Wide rather than tall.**

**What it must not resemble.** **The Stock Exchange (#8), which shares this mass and this plot, and
they are era ten's designated pair.** §5 separates them **by section**: *"one is a shed, the other
is a slab of floor."* A shed is a single-volume span with a flat top edge sitting on the deck; the
Exchange is a deep floor plate **cantilevered out over the older street**, so its whole silhouette
has a soffit and an overhang and no ground under one side. **Keep this one landed on all four
edges.** Across eras, against **era eight's Weather Office and Telephone Exchange** — the other
long low banded halls — the separation is substance and is free: ribbon glazing in a board-marked
concrete frame against a dark composite shed with a bracketed glass band and trays on the outside.
And against **era nine's Data Centre**, also a blank hall-mass box: era nine's has no glazing worth
the name and a louvred plant wall, where this has a long occupied glass gallery.

---

### 4. the Signal Tower — `TRG.4`, `tower` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Mast*, which the lead named and which the
> guide records as kept.** The announced name becomes **"Tower, the Signal Tower"** — the mass
> handle repeated back — which is reported above as information and changes nothing about the form.

**Plot: 2×2 (8×8u).** The square plot is deliberate and was tested: a single tile was tried on this
mass and reverted on 2026-07-28, because a contain-fit applies one uniform scale and a smaller plot
therefore shrinks a model whole rather than making it slender. **The slenderness has to be authored
into the model.**

**Silhouette.** **An open lattice mast rising off a low clad podium, with two banded drums up its
height.** One dominant vertical you can see straight through, and one accent — the drum antennas.
Authored **many times taller than it is wide**, and that proportion is the whole of what makes it
the tallest thing in the era.

**How it stands up.** A clad equipment podium at the base holds the ground; the lattice stands off
it and ignores it. The mast is an open steel frame — triangulated, legible as air from any azimuth
— with drum antennas banded round it at two levels and a **cage ladder is NOT on this one**: §5
reserves the external climb for the inherited comms tower, *"the climb belongs to the chain, so it
stays with the building that carries it."* Keep this face clear.

**Materials and ornament.** Steel lattice, unpainted and dark. Dark composite panel on the podium
with seams and fixings expressed. Conduit and cable risers run up one leg of the lattice in the
open, bracketed and bundled, which is the era's texture applied to a frame. **No signage stack** —
a mast has nowhere to put one — and no animated display.

**The detail that has to read: you can see through it.** The lattice must read as open frame at
full zoom-out, with sky visible through the triangulation from every azimuth. **A mast that reads
as a solid shaft is era three's Stronghold or era seven's Water Tower**, and this is the era-ten end
of the run's strongest chain, whose invariant is the open frame rather than the tower.

**Props.** A lit hazard beacon at the head — **emissive surface only**, bright in itself, lighting
nothing, and never a flashing light in the scene. Guy anchors are not used here; they belong to
`TRG.6`. Cable risers, a junction box and a bundled drop at the podium. Cameras in a pole-mounted
group at the podium's edge.

**Height.** **The tallest thing era ten draws, clear of everything else.** It should still not be
authored *at* the 24-unit ceiling, which caps by silently squashing and which §3 reserves for the
inherited comms tower.

**What it must not resemble.** **The Broadcast Tower (#6), which shares this mass and this plot.**
Under the recommendation in #6 they separate on **substance** — open lattice against closed clad
shaft — which reads at any zoom. If that recommendation is not taken, the fallback separation is
**where each one stands**: this one is on its own podium at deck level and the other is on the roof
of an older building, and the older fabric under `TRG.6` is a full building's worth of silhouette.
Across eras, against **era eight's Cooling Tower** (a waisted curved shell — free) and **era
nine's Office Tower** (a flush glazed prism on a stone podium, closed on every face — also free).

---

### 5. the Data Vault — `TRG.5`, `store` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Vault***, which `eras/README.md` lists among
> the ordinary-words-used-evocatively the naming rule is *for*. **The new name puts *Data* one era
> from era nine's Data Centre** — reported above, and handled in the confusion set below.

**Plot: 2×2 (8×8u).** **Not the long two-cell strip** — §5's strip is `NUM.F`'s (Defect 1). This
building has to read **long** and the plot will not do it, so author it emphatically longer than it
is deep and let the contain-fit keep the proportion.

**Silhouette.** **A blank monolith with one horizontal louvred band across it, and nothing else.**
One dominant shape, one accent, and the accent is a grain change rather than an object. Flat top
edge, unbroken.

**How it stands up.** A single sealed volume landed on the deck, its panel skin wrapped over every
face with **no opening at all** except one service door. The louvred plant band runs the full length
of one elevation as a horizontal register. Flat roof behind an upstand.

**Materials and ornament.** Dark composite panel throughout, seams and fixings expressed.
Aluminium louvre for the plant band. **No glass anywhere.** **And no signage of any kind** — no lit
letters, no plates, no blades, no animated display — which in this era is a deliberate and very
loud absence. §5 makes it the separating axis: the chain's store is the one with the advertising
front, and *"the pair separates on the one prop the chain cannot do without."*

**The detail that has to read: the louvred band against the flat panel.** A full-length field of
fine horizontal louvre reading as a **stripe in an unstriped wall**, legible at zoom-out as a grain
change. It is the only thing on the building that says anything is inside it.

**Props.** One service door and a hazard plate, and that is nearly the whole prop budget. A flush
service hatch. Perforated deck panels and a puddle at the foot. **No planting, no seating, no
drone dock, no cameras clustered for show** — nobody comes here, and the absence of people-props is
a real read.

**Height.** Below the Hologram Theatre and above Drone Command. **Low and long.**

**What it must not resemble.** **Era nine's Data Centre (`EL.1`), and this is era ten's sharpest
cross-era pair.** Both are blank clad boxes on the `hall`/`store` masses with a louvred plant field
and no glazing, one era apart, both permanent, and under the rename both carry the word *Data*.
They separate on **top edge and grain, never on geometry**:

| | **the Data Vault** *(era 10, `TRG.5`)* | **the Data Centre** *(era 9, `EL.1`)* |
| --- | --- | --- |
| Top edge | **Flat and empty** behind an upstand | **A rank of chiller drums** standing proud of the parapet — the plant *is* its silhouette |
| Louvre | A **horizontal band** across one elevation | A **full-height wall**, floor to parapet, on one face |
| Skin | Seamed panel with **visible fixings** and open joints | Sealed rainscreen with **no visible fastener anywhere** |
| Ground | Lands on the deck | Held off the paving by a **shadow gap** |
| Signage | **None at all** | A back-lit signage band and a display panel by the door |

**The drum rank is the separation to protect** — era nine's box has none of its silhouette without
it and era ten's must have nothing above its parapet. Within era ten, against **the Quantum Core
(#9)**, also a sealed panel box: the Core stands on visible isolator mounts with a band of air
under it and a plant rack bracketed on its flank, where this lands flat on the deck.

---

### 6. the Broadcast Tower — `TRG.6`, `tower` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Rooftop Mast*** and author *"a second,
> slimmer mast on a retrofitted older roof, guyed, with a lit hazard beacon."* **This brief takes
> the one liberty the new name licenses and says so plainly** — see the two-towers judgement above.
> The files' form is a second lattice mast; the recommendation below is a closed clad shaft. **An
> artist handed the files' wording should draw the mast and raise the question**; an artist handed
> the new name should draw what follows.

**Plot: 2×2 (8×8u).**

**Silhouette.** **A closed, gently tapering clad shaft rising off an older building's roof, with a
banded drum of transmitter galleries at its head.** One dominant vertical — solid, not open — one
accent, the drum, and beneath both the **kept older building**, visible as a whole silhouette of
another era's architecture with a new tower standing on it. **The retrofit is half of what you see**
and it is what makes this building era ten rather than a tower.

**How it stands up.** **Straddling, not landing.** A new bracketed frame sits on the older roof and
transfers its load down past the old parapet on visible external legs, so the joint between the new
and the kept is expressed rather than concealed and the old roofline runs on uninterrupted
underneath. Guy wires anchor from the shaft's upper third down to points on the older roof and the
deck beyond — **keep them, because they are the only thing in the era that draws a straight line
through open air**, and they are era ten's answer to the mass's *open frame* invariant now that
the shaft itself is closed.

**Materials and ornament.** Dark composite panel over the shaft, seams and fixings expressed, the
panel courses reading as horizontal bands up the taper. Dark switchable glass in a **narrow
vertical slot** up one face at the galleries. Bracketed conduit and a cable riser climb the shaft
in the open, and a bundled drop crosses the old roof to the older building's own services. **One
lit band at the drum's underside**, emissive surface only.

**The detail that has to read: the older building underneath, and the joint.** The kept fabric must
be legible as **another era's building** — a parapet line that does not match, a floor level that
does not match, a material that is not dark composite panel — with the new frame's legs standing on
it. **If the older building reads as a podium this tower has become the Signal Tower with a base.**

**Props.** A lit hazard beacon at the head, emissive surface only, lighting nothing. Guy anchors
bolted to the old roof and to the deck. Cable trays crossing the old roof. A drone dock cradle on
the shaft's flank. Cameras on a corner bracket at the drum.

**Height.** **Second in the era**, below the Signal Tower and above the Steam Vent — and the older
building under it means its *apparent* top is higher than its own model's, which is a free gain
that costs no world units.

**What it must not resemble.** **The Signal Tower (#4), and this is the pair the two-towers
judgement is about.** They separate on **substance**: **open lattice against closed clad shaft**,
which is the same axis era eight used for its Cooling Tower against its pylon yard and era nine
called *"open frame against closed mass … the era's clearest pair."* The backup axis is **what it
stands on** — a clad podium at deck level against a whole older building. **Do not let both be
lattice.** Across eras, against **era seven's Water Tower** — a blank square brick shaft, also
closed and also machine-topped: era seven's is load-bearing brick in thin even courses with
cast-iron above its parapet and pipes at its foot, where this is a panelled taper with a glazed
slot, guy wires and a drum. Substance separates them for free.

---

### 7. the Robotics Lab — `TRG.7`, `workshop` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Rooftop Lab*.** The change from *Rooftop* to
> *Robotics* removes the one word that was carrying the retrofit, so **the retrofit now has to be
> carried entirely by the form** — see the detail that has to read.

**Plot: 2×2 (8×8u).**

**Silhouette.** **One low storey of dark glass straddling an older roof, with an open antenna deck
beside it.** One dominant shape — a single glazed horizontal box, wider than it is tall — one
accent, the open rooftop deck of rigs and antennas, and underneath both the kept older building.

**How it stands up.** **A bracketed frame straddling older fabric**, not a building on a base: the
new storey is carried on external brackets and legs off the older structure, with the old parapet,
the old roofline and a mismatched floor level all visible through and under it. The antenna deck is
an open grated platform at the same level, railed rather than walled.

**Materials and ornament.** Dark switchable glass over the whole storey — this is the era's glass
building — on a bracketed steel frame, with dark composite panel only at the end returns. Conduit
and cable tray bundle down the brackets and across the old roof in the open. **No animated display
anywhere on it**, which §5 makes the separating axis against its own chain: *"the animated display
is all this chain has left and it cannot be shared."* Keep that absence.

**The detail that has to read: the daylight under the new storey.** The gap between the new floor
and the old roof must be open and visible from every azimuth — brackets, legs, services crossing —
so the building reads as **two buildings of different ages, one standing on the other**. **This is
the run's clearest single image of retrofit** and it is the only thing the rename took the word
for.

**Props.** Test rigs and antennas on the open deck, railed. A grating with a plume at the old
roof's edge. Cable trays and a junction box on the brackets. A wall-cradle drone dock. Weed in the
deck gaps below.

**Height.** **The shortest roofed model era ten draws**, above only the Neon Plaza — though it
*sits* high, because the older building carries it.

**What it must not resemble.** **Drone Command (#2), on the same mass** — glass straddling a roof
against a blast wall on the deck, which is §5's three-way separation with the third member being
the never-drawn chain instance. And **the Broadcast Tower (#6)**, which is the other era-ten
building standing on an older roof: **a horizontal against a vertical**, one storey spread wide
against a shaft rising, and the Tower has a drum and guy wires while this has a railed open deck.
Across eras, against **era nine's Chip Factory** — sealed and windowless against wholly glazed, which
is free — and against **era eight's Wind Tunnel**, a compact framed block with one tall glazed bay
standing on a plinth a few steps up: board-marked concrete on the ground against dark glass in the
air.

---

### 8. the Stock Exchange — `TRG.8`, `hall` mass

**No rename. The files read *the Stock Exchange* and this brief uses it.** This row was the one row
in the roster table that named no material until it was filled in on 2026-07-29, so it is now the
most fully specified building in the era and the brief follows it closely.

**Plot: 2×2 (8×8u).**

**Silhouette.** **A deep slab of floor cantilevered out over the older street, with a lit line
running the whole length of its underside.** One dominant shape — the horizontal slab — one accent,
the lit soffit reveal. **The overhang is the silhouette**: one edge of this building has no ground
under it at all.

**How it stands up.** **New-built on the deck and cantilevered**, and both halves are load-bearing
for the era's own logic. §5 keeps era ten's three hall-mass buildings apart by exactly this: the
inherited interchange hall is the one *occupied from above*, and `TRG.3` and `TRG.8` are the two
that are not — *"making this a retrofit of something would have collapsed the distinction that
keeps three halls apart."* So it lands on the deck on its own structure, and the far edge runs out
over the older street below as an overhang and a rail rather than a wall meeting ground. One deep
undivided trading floor inside; flat roof behind an upstand.

**Materials and ornament.** Seamed dark composite panel with **its fixings left visible**, which
the correction banner names as the first of three register cues this building must carry. Dark
glass only where the floor plate's frontage looks onto the deck. **Bracketed cable risers climb the
elevation in the open** — the second cue. An **animated board of moving figures faces the deck** —
the era's tally descendant at its largest.

**The detail that has to read: the lit reveal under the overhang.** A single emissive line running
**the whole length of the soffit** beneath the cantilever — bright in itself, lighting nothing, no
pool on the older street below and no glow on the underside beside it. This is the era's signature
move at its clearest and it is the third register cue the correction banner names.

**Props.** The animated board, its figures moving, facing the deck. Stacked signage at the
entrance. Bracketed cable risers and junction boxes on the elevation. A rail along the cantilevered
edge. Planting in lit containers at the frontage. Perforated deck panels and puddles below.

**Height.** Below the Steam Vent and above the Hologram Theatre. **Deep rather than tall.**

**What it must not resemble.** **The Hologram Theatre (#3), which shares this mass and this plot.**
§5 separates them **by section**: *"one is a shed, the other is a slab of floor."* The Theatre is a
single-volume span landed on all four edges with a glazed gallery banded across one face; this is a
floor plate with an overhang, a soffit and a rail. **The cantilever is what must never be dropped
from this one.** And, per D-ERA8 and the correction banner, **the animated board may never show
anything about trigonometry** — an exchange hall is where a session's worth of figures is read off,
which is why the institution is plausible for `TRG.8`, and the mathematics lives in the lesson
framing rather than on the elevation.

---

### 9. the Quantum Core — `TRG.9`, `dwelling` mass

> **✅ MERGED, AND IT IS A FORM CHANGE RATHER THAN A RENAME. Until the pass landed the files read *the
> Module Stack* and author stacked living capsules.** A module stack is housing; a quantum core is a
> machine in a controlled enclosure. **The mass and the plot are unchanged** — see *Two form
> changes* above for the full quoted form, and for the judgement on what this costs era ten's
> housing. **The announced name is "Dwellings, the Quantum Core", and that contradiction is
> accepted rather than repaired.**

**Plot: 2×2 (8×8u), the square full plot.**

**Silhouette.** **A low broad sealed shell standing clear of the deck on a rank of squat mounts,
with a field of finned units across its roof.** One dominant shape — the shell, wider and deeper
than it is tall — one accent, the finned rank on top, and beneath the whole thing **a continuous
band of air**. The gap under the building is as much of the silhouette as the building is.

**How it stands up.** **On isolator bearings, touching nothing.** A rank of squat anti-vibration
mounts lifts the shell off the deck so daylight runs under it from any azimuth. **No galleries, no
walkways, no modules, no windows.** A cryogenic plant rack of ducts, headers and vessels is
bracketed along one long elevation in the open, and the roof is flat behind an upstand with the
heat-rejection units ranked across it.

**Materials and ornament.** Dark composite panel over every face, seams and fixings expressed. Dark
switchable glass at **one deep-set inspection reveal** on the entrance face, and nowhere else.
Exposed ductwork and vessels on the plant rack. **No signage stack and no animated display** —
this building tells nobody anything.

**The detail that has to read: the band of air underneath.** The isolator mounts must be visible as
objects and the gap must be open all the way through from any azimuth. **Everything else about this
building is one idea — a machine that fails if anything touches it — and the gap is the cheapest
and most legible carrier of it.** Behind the reveal, the **suspended cylindrical cryostat** hanging
on its stays should be visible as a shape rather than as a detail.

**Props.** An airlock-scale personnel door with an interlock plate beside the reveal. The plant
rack's ducts and vessels on one flank. A hazard plate. Cameras on a corner bracket. **No planting,
no seating, no drone dock, and no weed in the deck gaps on this plot** — the ground is swept clear
under a machine.

**Height.** Below Drone Command and above the Robotics Lab. **Low and broad**, which is where the
form change moves it: §3 had this node's building second in the whole era.

**What it must not resemble.** **The Data Vault (#5)**, era ten's other sealed panel box: the Vault
lands flat on the deck with a horizontal louvred band and nothing above its parapet, and this
stands on visible mounts with a plant rack on its flank and a finned field on its roof. **The
mounts are the separation.** And **The Pod Apartments (#12)**, which is the building this node used
to be — a lit capsule rack with galleries and layered signage against a blind machine hall with
neither. **This is the confusion the form change removes**, and it is the strongest single argument
for the change: era ten no longer holds two capsule racks. Across eras, against **era nine's Data
Centre** and **era eight's test house**, both blank framed boxes — the band of air and the external
plant rack put this nowhere near either.

---

### 10. the Steam Vent — the hub, `town-hall`

**No rename. The files read *the Steam Vent*, which the lead named.** The hub is the one building
in the city that rethemes every era, so era ten's replaces era nine's Headquarters rather than
standing beside it. **Only one hub ever stands.**

**Plot: the wide plot, 3×2 (12×8u).** The era's landmark, and unique by right.

**Silhouette.** **A lit plant stack rising through the deck, with gratings at its foot breathing
steam and people standing at them.** One dominant shape — the stack, the tallest thing on the
plot — one accent, the field of gratings and the plume at ground. **Wide rather than tall overall**,
with all of the height in the stack.

**How it stands up.** **Through the deck rather than on it**, which is the whole idea: the stack
comes up from the servicing layer below and the deck is cut around it, so the walking surface meets
the building at a grating rather than at a wall. Bracketed ducts and risers run up the stack in the
open. A low clad plant base spreads across the rest of the plot with the gratings set into the deck
over it.

**Materials and ornament.** Dark composite panel over the stack and the base, seams and fixings
expressed. Perforated and grated deck around the foot. Exposed ducting and cowls. **One emissive
band round the stack** and **lit strips along the grating edges** — emissive surface only, bright in
themselves, lighting nothing and casting nothing on the people standing there. A stacked signage
frontage at the public edge, and an animated display over it.

**The detail that has to read: people standing at the warm grating, because it is the only warm
place on a cold deck.** Era one's Great Hearth was a stone ring under a canopy where people stood
to keep warm; ten eras later the fire has become a boiler, a plume, waste heat and now an exhaust,
**and people are standing at it to keep warm again.** This is the tenth and last link in the
*sheltered communal fire* through-line and it closes the run. **The steam is geometry and tone
only** — it is not lit, it does not glow, and nothing is lit by it.

**Props.** Floor gratings with plumes, a wall vent, a stack cowl. People at the gratings, standing
rather than seated. Planting in lit containers at the edges. Stacked signage and an animated
display. Perforated deck panels, service hatches, puddles and rubbish caught in a grating.

**Height.** Third in the era, below the two towers. **Wide rather than tall**, and the hall finishes
the run outside the top two, where it began the run at the top of it.

**What it must not resemble.** **Nothing in era ten, and this is worth stating rather than leaving
as an absence: the hub is the only building that rethemes, so era nine's Headquarters is
replaced rather than joined.** Only one hub ever stands, which is the same clean result era nine's
brief recorded for the same structural reason. **The risk here is a different one** — the Steam Vent
is a plant stack, and **era ten also carries a plant stack on Drone Command's corner mast and a
finned field on the Quantum Core's roof.** Keep the hub's stack **singular, tall and public**: one
stack, standing free through the deck, with people at its foot. If the plot reads as roof plant on
a low building it has become the machinery it is meant to be the civic face of.

---

### 11. The Vertical Farm — civic, food *(1×1)*

**Plot 1×1 (4×4u), the smallest plot in the era. Cost 40,960 data, food for ~10,240 + 2,560
happiness.** Wins on **land efficiency — food on one cell, a first in the run** — and on being the
one domestic luxury the city has; loses on resource efficiency.

**Silhouette.** **A slender tower of stacked trays behind translucent panels, with tanks at its
crown.** One dominant vertical on a single cell, one accent — the water tanks. A service core with
an external lift runs up one face and gives the shaft its one asymmetry.

**How it stands up.** A steel frame carrying growing trays floor by floor, wrapped in translucent
polycarbonate panel rather than the era's dark composite; the service core is expressed on one face
with the lift running outside it. The whole thing lands on one cell, so it is authored several
times taller than it is wide and the contain-fit keeps the proportion.

**Materials — and this building departs from the era default more than any other.** **Translucent
polycarbonate panel** instead of dark composite, **steel frame** rather than a panelled shell, and
an **emissive grow-light glow** through the panels. It is the only pale building in era ten, and
that is the point.

**The detail that has to read: green, visible through the panels.** The produce has to read as
**food people eat** rather than as industrial biomass, because the 2,560 happiness is the luxury of
fresh food in a city that otherwise eats out of vending banks. **A tower that reads as a chemical
plant is claiming an amenity the player cannot see.** Green must be legible through the translucent
panels at the locked ~49° tilt, from any azimuth.

**Emitted light.** The grow-light is **an emissive surface inside the model** — the panels
themselves are bright, in a pink-white that the era's cyan accent does not otherwise use — and they
light **nothing**. No glow into the air, no cast on the deck, no bloom at the edges, and no
coloured light on the buildings beside it.

**Props.** Water tanks at the crown. An external lift on the service core. A trough of planting at
the foot. Service hatches in the deck.

**Height.** ~21 units, second among the civics, just below the Pod Apartments.

**What it must not resemble.** **The Pod Apartments (#12), and this is era ten's designated
dominance pair** — same 1×1 plot, same magnitude, same era, both slender single-cell towers of
almost the same height. They separate on **substance and aperture**, and the axis has to be strong
because the numbers alone will not do it at zoom-out:

| | **The Vertical Farm** | **The Pod Apartments** |
| --- | --- | --- |
| Skin | **Translucent pale polycarbonate**, lit from within | **Dark composite capsule modules in a dark steel rack** |
| Reads as | A **continuous glowing column** with green behind it | A **grid of small lit rectangles**, each a window |
| Face | Smooth wrapped panel, one service core | **Open walkway galleries** projecting on the outer face |
| Crown | **Water tanks** | Nothing; the rack simply stops |
| Signage | None | **Layered over everything** |

**Pale-and-continuous against dark-and-gridded is the separation to protect.** Across eras, against
**era nine's Condominium** and **era eight's Apartment Tower**, both 1×1 shafts: neither is
translucent and neither is pale, so substance carries it free.

---

### 12. The Pod Apartments — civic, livability *(1×1)*

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *The Capsule Homes*.** Reported above: *Apartment*
> was ruled unavailable in this column on 2026-07-29, on the grounds that era eight's bought
> housing is The Apartment Tower and stands in the same city forever. **Not re-litigated here**, and
> the name is used throughout.

**Plot 1×1 (4×4u). Cost 35,840 data, 10,240 livability.** Wins on **the cheapest livability in the
era** and on land efficiency — the whole population on one cell; loses on **no happiness at all**,
and the catalogue calls it *"the least dignified housing in the game."*

**Silhouette.** **A dark steel rack full of small lit rectangles, with galleries running across its
outer face.** One dominant shape — the rack, tall and narrow on one cell — one accent, the projecting
walkway galleries that give the elevation its horizontal stripes. The rack simply stops at the top;
there is no crown.

**How it stands up.** **The rack is the architecture and the modules are the infill**, which is the
era's structural vocabulary in its purest form: a steel frame carrying capsule modules that are
clearly separate objects sitting in it. Open mesh galleries run along the outer face at every level
on their own brackets, and exposed services climb one side in the open.

**Materials.** Steel rack, capsule modules in composite, mesh galleries, emissive signage layered
over everything. It shares the era's body hue and departs from it only in that the modules read as
**separate objects in a frame** rather than as a wrapped skin.

**The detail that has to read: every module has one small window and it is lit.** The elevation is
a **grid of small bright rectangles** — an emissive surface per module, bright in itself, lighting
nothing, no glow around any of them and no cast on the galleries. That grid is the whole of what
says *people live here* on a building that has no lobby, no entrance to speak of and no green.

**Tone, and it is a rule rather than a preference.** This is the one building in the set that could
read as punitive. **INV-ERA-3** means nothing about it may key off study pace, absence, streaks or
wall-clock time, and the visual design brief bans artificial scarcity and guilt framing. **Cramped
is period texture — cyberpunk density is a genre, not an accusation** — so draw it dense, lit and
inhabited, with the galleries in use, and never as squalor and never as what the player deserves.

**Props.** Layered signage over the frontage. Exposed services up one side. A parcel locker and a
wall-cradle drone dock at the foot. Planting in a lit trough at the base.

**Height.** ~22 units, **the tallest civic in the era and at the ceiling**, which the ceiling caps
by silently squashing. *(See **Defects**: §3 says nothing but the inherited comms tower comes near
the ceiling, and this does not bear that out.)*

**What it must not resemble.** **The Vertical Farm (#11)** — the table at #11 carries both axes, and
pale-and-continuous against dark-and-gridded is the one to protect. **And era eight's The Apartment
Tower and era nine's The Condominium**, which is a three-deep civic-housing pile-up: all three are
narrow single-cell shafts, all three are frozen, all three stand on an era-ten island. They separate
on **frame and face**: era eight's is a **concrete frame with infill panels in two tones and ribbon
balconies**, era nine's is a **sealed rainscreen with balconies on alternating floors and a glazed
lobby**, and era ten's is an **open steel rack with capsule modules sitting in it, mesh galleries
and no lobby at all.** **Frame-and-balcony against rack-and-capsule is the axis**, and era ten's is
the only one of the three whose dwellings are visibly separate objects.

---

### 13. The Night Market — civic, happiness *(3×2)*

**Plot 3×2 (12×8u), six cells. Cost 46,080 data, 10,240 happiness.** Wins because **it is the
warmest place in a cold city and the era's signature**; loses on land efficiency at six cells.

**Silhouette.** **A slack fabric canopy on poles over a floor full of stalls, with signage hanging
everywhere under it.** One dominant shape — the canopy, curved and sagging between its masts — one
accent, the dense hanging signage beneath. **Mostly covered ground rather than a building**, and it
must read that way at every azimuth.

**How it stands up.** Tensile fabric over steel masts and stays: the canopy is in tension and the
poles are in compression, and nothing else on the plot carries anything. Stall frames stand free
underneath in a loose grid on a wet paved floor. There are **no walls**, so the plot is visible
straight through from any direction.

**Materials.** Tensile fabric canopy, steel stall frames, **dense emissive signage**, wet paving.
The fabric is the only soft material in era ten and the only thing in the era that curves without
being a machine.

**The detail that has to read: the density of small lit signs, and people seated among them.**
Layered neon and hanging signage at **many small sources across the whole plot** rather than one big
plane, with seating at low tables, steam and cooking smoke rising through the canopy, and
reflections in the wet floor. **Every sign is an emissive surface** — bright in itself, lighting
nothing, no glow, no coloured cast on the fabric above and no pool on the paving. **The reflections
in the wet floor are a material read**, flat and tonal, and never a mirrored gradient.

**Props.** Stalls, low tables and seating. Hanging signage in three sizes, some flickering and some
dead. Steam and cooking smoke. Puddles and rubbish caught in a grating. Planting in lit containers
along the edge.

**Height.** The canopy at ~8 units, third among the civics and above only the Nightclub.

**What it must not resemble.** **The Nightclub (#14)** — the six-axis table above carries it in
full, and **open canopy against closed slab is the axis to protect**. Across eras, against **era
four's and era six's covered markets**, which are also mostly-ground happiness plots: masonry
arcades and stone colonnades against fabric on masts, which is free at any zoom. And against **era
seven's Wash House**, the other happiness civic with steam: era seven's steam comes out of ridge
louvres on a brick roofline over a walled drying yard, where this rises through open fabric over
open ground.

---

### 14. The Nightclub — civic, blend *(2×2)*

> **✅ MERGED, AND THE BUILDING CHANGES WITH IT. Until the pass landed the files read *The Reservoir*** and author a
> covered reservoir under a public water hall. **The lead has ruled that The Nightclub stands**,
> with the Night Market collision accepted, after the water-lineage argument was put to him — see
> ruling 3 above, where the blend-row pattern is confirmed from all ten files. **No number moves:**
> 2×2, 5,120 livability + 5,120 happiness, 61,440 data.

**Plot 2×2 (8×8u). Cost 61,440 data, 5,120 livability + 5,120 happiness.** Wins on **the blend, and
being the only thing in the era the city gives away**; loses on resource efficiency.

**Silhouette.** **A low blank slab with one lit blade projecting off its frontage and a line of
people along its edge.** One dominant shape — the shut, flat-topped mass — one accent, the single
projecting blade sign. **Deliberately the lowest building in the era**, so it reads as ground rather
than as another tower, and it is the only civic here that does.

**How it stands up.** A single sealed volume landed on the deck, its panel skin wrapped over every
face, with **one** deep-set entrance recess and no other opening. A shallow overhang runs along the
frontage over the public edge. Flat roof behind an upstand carrying ventilation cowls and plant.

**Materials.** Dark composite panel with seams and fixings expressed, exposed conduit and cable
tray, grated slots in the deck along the frontage, and **a single emissive line** along the parapet.
The one departure from the era default is how little there is: no glass, no stacked signage, and one
lit object.

**The detail that has to read: the public frontage, and it is load-bearing.** The 5,120 livability
has to be visible or the building is claiming a capacity the player cannot see — which is exactly
the objection the files raised against the previous nightclub, that it *"had to argue its own
livability into existence"* from a back half bolted on behind it. **So the amenity is on the front,
under the overhang and along the deck**: **free water points and heated seating set into the
building's own street edge**, lit from the soffit through grated slots, with people using them
without paying. **This is the blend family's shared amenity, on the side of the building the camera
can see**, and it is what keeps the row honest now that it is no longer water.

**Emitted light.** Two emissive surfaces only: **the projecting blade sign** and **the soffit line
over the public frontage**. Both bright in themselves, both lighting nothing — no pool on the deck,
no glow on the queue, no cast on the panel above.

**Props.** A queue rail along the frontage and people standing at it. Heated seating and water
points under the overhang. Ventilation cowls and a hatch gantry on the roof. Grated slots in the
deck, lit from beneath. Puddles and rubbish caught in a grating.

**Height.** **The lowest building in the era**, below the Night Market's canopy.

**What it must not resemble.** **The Night Market (#13)**, and the six axes are tabled above: **open
canopy against closed slab**, six cells of ground against four cells of building, many small lit
sources against one large lit plane, steam through the canopy against cowls on a roof, people
scattered and seated against people in one line, and a sagging curve against a hard flat edge.
Within era ten, against **the Data Vault (#5)**, the era's other blank low slab: the Vault has a
horizontal louvred band, no signage of any kind and no people at all, where this has one lit blade,
a public frontage and a queue. Across eras, against **era eight's Fire Station** — the blend one era
back on the same two cells rotated — the separation is institutional and free.

---

## The cumulative confusion set

**The skill's Step 5 scopes "what it must not resemble" to the era's own siblings. That is too
narrow everywhere, and at era ten it is as narrow as it ever gets.** Under the 2026-07-29
no-re-dress ruling a skill building is drawn once, keeps its look permanently and is never
demolished, and a civic building is frozen at purchase — so **an era-ten city has all nine earlier
eras standing on it**: 53 skill buildings from eras one to nine, plus up to 36 civic purchases from
those eras, plus era ten's own nine skill buildings, its hub and up to four civic purchases. **62
skill buildings stand at the end of the run** — the ten rosters summed from `ERA_SEQUENCE` are
6 + 5 + 5 + 5 + 5 + 6 + 6 + 9 + 6 + 9 — **and this is the last set anyone adds.** Every confusion
set above is therefore scoped cumulatively.

**What was checked, and how deeply.** **Era nine in full, from its merged brief** at
`output/imagegen/era-09-information-building-briefs/README.md`, because it is adjacent and because
it was written against era ten and names era ten's buildings in three of its own confusion sets.
**Eras seven and eight from their merged briefs.** Eras two, four, five and six **as a scan** from
their merged briefs, and **era three from its brief, which merged mid-run** (`#263`, re-checked
below). **Era one as a scan from its source documents**, having no brief on `integration` at
`bc27f02`.

> **What moved while this was being written, and what it does to the findings.** The document was
> researched at `b2fd03d` and finished at **`bc27f02`**, where `integration` had moved. **One PR
> landed in between — `#263`, era three's brief — touching one file under `output/imagegen/`.**
> Measured rather than assumed: `git diff --name-only b2fd03d bc27f02` over
> `docs/superpowers/specs/eras/`, `packages/skill-graph/`, `apps/web/src/city/` and `biome.json`
> returns **nothing**, so era ten's two documents, `ERA_SEQUENCE`, `NODE_FOOTPRINTS`,
> `buildingAssets.ts`, `eraDressing.ts` and the linter config are all unchanged and every claim
> above still reads at the tip. **Era three's brief mentions era ten nowhere**, and its ten
> buildings — a mud-brick trade hall, an open-fronted foundry, a sealed bonded store, an
> ingot-weighing yard, a bastion tower and four civics in mud brick and undressed stone — sit
> nowhere near era ten on substance, which is the scan result recorded below.

### Era nine named six cross-era pairs. Does era ten reopen any?

Era nine's brief resolved six. Read against era ten's set at `bc27f02`, **two of the six are era
ten's, one of those is closed outright by a form change, and one new pair appears that era nine
could not have seen.**

| # | Era nine's pair | Does era ten reopen it? |
| --- | --- | --- |
| 1 | `EL.4` against era eight's three sheds | **No.** Era ten has no shed with a dock face. Nothing on this. |
| 2 | `EL.6` against era eight's Power Station *(was the Substation)* **and era ten's dish yard** | **NO, as of 2026-07-30 — the pair is DISSOLVED rather than managed.** `TRG.1` is re-authored as the Neon Plaza and has no dish, no pad, no mount and no fence, so there is nothing left of era ten's half of it. *(Until then this read: "**YES, and it is live** … era ten's obligation is to keep the trays conspicuously above the surface, which brief #1 states." Era nine's own rule — trays flush in its paving — is **left alone rather than reopened**, because it is sound for era nine's building on its own terms and nothing here asks it to change.)* |
| 3 | `EL.3` against era eight's two workshops **and era ten's fab shop** | **CLOSED, by the form change.** Era nine called era ten's fab shop *"the same building one era on"* and *"the sharpest cross-era confusion this building has"*, separated only by whether the fixings show. `TRG.2` is now **Drone Command** — a hardened block with a drone deck, no airlock and no gas store — so the two buildings no longer resemble each other on any axis. **This is the clearest downstream benefit of the form change** and era nine's brief can be read as over-specified rather than wrong. |
| 4 | `EL.1` against era eight's two halls | **No.** Era ten's halls are a glazed-gallery shed and a cantilevered floor plate, neither of which is a long low ribbon-glazed block. |
| 5 | The Condominium against era eight's Apartment Tower | **YES, and era ten makes it three-deep.** **The Pod Apartments** is a third narrow single-cell civic housing shaft standing in the same city. Brief #12 carries the three-way separation: **frame-and-balcony against rack-and-capsule**, with era ten's the only one whose dwellings are separate objects. |
| 6 | The Distribution Center against era eight's Supermarket and era four's Grain Dock | **No.** Era ten's food civic is a translucent 1×1 tower, which is nowhere near a 2×2 food box. |

**And one pair era nine could not have named, because era ten's rename created it: `the Data Vault`
against `the Data Centre`.** Two blank clad boxes with a louvred plant field, one era apart, both
permanent, and now sharing the word *Data*. Brief #5 carries the table; the drum rank on era nine's
roof and the flat parapet on era ten's are the separation.

### The rest of the scan, and where it is genuinely free

- **Eras one, two and three cost era ten nothing**, and the reason is structural rather than lucky:
  their materials are earth, thatch, mud brick, undressed stone and unmortared masonry, and era
  ten's are dark composite panel, dark glass, exposed conduit and emissive signage. **Substance
  separates them at every zoom.** The only pairs worth naming at all are the ground-only plots —
  era two's Sheep Pen and era three's ingot-weighing yard against the Neon Plaza — and woven
  hurdling on trodden earth against a mesh fence on perforated deck settles those without an
  argument.
- **Eras four, five and six likewise.** The nearest approaches are institutional rather than formal:
  era six's Lecture Theatre against the Hologram Theatre shares a head noun and no geometry, and
  era four's and era six's covered markets sit near the Night Market in function while a stone
  colonnade and a fabric canopy sit nowhere near it in form.
- **Era seven is where the cumulative set starts to cost something, and it costs exactly one
  building.** **The Water Tower** — *"a blank square brick tower … a cast-iron weight case rising in
  its head, a lifting gantry across the top"* — is a closed, machine-topped shaft, and under the
  recommendation in brief #6 so is the Broadcast Tower. **Substance carries it**: machine-made brick
  in thin even courses with iron above the parapet, against a dark panelled taper with a glazed
  slot, guy wires and a drum. Nothing else in era seven approaches era ten: soot-dark brick, cast
  iron, slate and glazed monitor roofs against dark panel and light.
- **Era eight contributes two live pairs and both are already written into the buildings above.**
  The Apartment Tower, in the three-deep housing pile-up at #12; and the Power Station, whose lattice
  frames on pads behind a mesh fence sit beside the Neon Plaza's bolted dishes — **open frames
  rising against closed discs tilted**, era nine's own axis, which holds for era ten unchanged.
  Era eight's Cooling Tower is free against both era-ten towers because a waisted curved shell is
  not a rectilinear thing.
- **Era nine is the expensive neighbour, and it is expensive because it is era ten's opposite.**
  Era nine seals, flushes and hides; era ten seams, brackets and shows. **That opposition is the
  separation** and it is stated once here so the individual briefs do not each have to argue it:
  **era nine's buildings have no visible fastener anywhere and era ten's show them**, era nine runs
  its services inside and era ten runs them across the face, era nine meets the ground with a
  shadow gap and era ten stands on a deck over older fabric. Where a pair above is close, that is
  the axis underneath the specific one.

### The circular forms — counted, and the count is NINE

**Era nine flagged a cap of three circular forms**, separated by orientation and substance, on the
reasoning that a technical era generates circles naturally — dishes, drums, tanks, rings — and
counted **five** against it, then argued two out to land on three. **Era nine also recorded that the
audit setting the cap is not in the merged tree and that its source is unverified**; that was
re-checked here at `bc27f02` across era ten's two documents, the folder README, the rulings record
and the merged briefs for eras two, three and four to nine, and **it is in none of them**. The cap
is applied here as era nine applied it, and its source remains unverified.

**Era ten generates more, exactly as predicted. Counting circular families that would read as a
circle or a cylinder at full zoom-out across era ten's fourteen buildings and its props kit, the
count is NINE:**

| # | Form | Where | Orientation | Substance |
| --- | --- | --- | --- | --- |
| 1 | ~~**Dish**~~ | ~~`TRG.1`, a rank of them~~ — **GONE 2026-07-30**, with `TRG.1`'s re-author as the Neon Plaza: era ten draws no dish at all now, and the chain's steerable pad is reference only | — | — |
| 2 | **Drum antenna** | `TRG.4` at two levels; `TRG.6` at its head | **Horizontal**, banded round a vertical | Closed, solid, ribbed |
| 3 | **Plant stack** | the hub, rising through the deck; the props kit's stack cowl | **Vertical**, tall, singular | Closed, panelled, hollow |
| 4 | **Finned heat-rejection unit** | `TRG.9`, a field of them on the roof | **Vertical**, small, in a repeating rank | Closed, finned |
| 5 | **Cryostat vessel** | `TRG.9`, behind the reveal | **Vertical**, suspended | Closed, seamless, hanging |
| 6 | **Water tank** | The Vertical Farm, at the crown | **Vertical**, small, in a pair | Closed, smooth |
| 7 | **Ventilation cowl** | The Nightclub, on the roof | **Vertical**, squat, in a group | Closed, capped |
| 8 | **Dome camera** | the props kit, on many elevations | **Pendant**, hemispherical | Closed, glossy |
| 9 | **Drone landing plate and rotor disc** | Drone Command's deck; the props kit's deck-edge dock | **Horizontal**, flat | A plate, and thin spinning discs above it |

**Nine against a cap of three, which is three times era nine's overshoot.** Six want removing or
flattening, and the era argues for most of them independently:

> **AMENDED 2026-07-30 — the count is EIGHT, and the one that went was the largest.** `TRG.1`'s
> re-author as the Neon Plaza removes the dish rank from era ten's drawn set entirely, so **#1 is
> struck** and the census stands at eight against the same unverified cap of three. The recommendations
> below are otherwise unchanged; nothing else in the table depended on the dishes.

- **Flatten the drone landing plate to a painted marking** (#9). Era nine established the principle
  on its heli-pad: *"a painted marking is not a form, so it does not enter the count."* A square
  deck plate with a circle painted on it is squarely in an era whose identification system is
  graphics fixed to surfaces. **Draw the parked drones stowed nose-in on the rack rather than
  rotors-up**, and the rotor discs go with it.
- **Square the dome camera to a corner-bracket housing** (#8). The props kit already offers *"a
  pole-mounted group, a corner bracket, a dome"* — **drop the dome and use the other two**, which
  costs the era nothing and removes a circle from every elevation in the city at once.
- **Square the ventilation cowls to louvred boxes** (#7). Era ten's own vocabulary is boxes,
  brackets and trays; a capped cylinder is the one shape on that roof that is not.
- **Square the water tanks to a panelled tank at the crown** (#6). The Vertical Farm is already a
  rectilinear panelled shaft and a rectangular tank sits better on it.
- **Merge the finned units into the plant-stack family or square them** (#4). A rank of finned
  cylinders on the Quantum Core's roof reads at zoom-out as a texture rather than as a circle; if it
  does not, square them, because the Core's silhouette is carried by the band of air underneath and
  not by its roof.
- **Keep the cryostat, but do not count it, because it is behind glass** (#5). It is visible through
  one deep-set reveal and never in silhouette, so at full zoom-out it does not read at all. **If a
  reviewer counts it anyway, square the reveal's opening and it goes.**

**That leaves three, cleanly separated on era nine's own two axes.** The **dish** is tilted, open
and concave, at deck level, in a fenced group — the era's signature circle and the one that should
stay unmistakable. The **drum antenna** is horizontal, closed and ribbed, banded round a vertical at
height, and it should be **one shared family used identically on both towers** so it reads as era
vocabulary rather than as a per-building shape. The **plant stack** is vertical, closed and
singular, rising through the deck at the hub, and it is the only circle in the era anybody stands
next to. **Tilted disc, banded drum, standing stack: no two share an orientation and no two share a
substance.**

### The dominance pair — the current numbers, and whether they are distinct

**The pair is the Vertical Farm against The Pod Apartments** (the files read *The Capsule Homes*
until the consolidated pass), and it was the last
catalogue the D-ERA24 sweep could not clear. **Read at `bc27f02`:**

| | **The Vertical Farm** | **The Pod Apartments** *(the files read* The Capsule Homes *until the pass)* |
| --- | --- | --- |
| Footprint | **1×1** | **1×1** — tied |
| Magnitude | **10,240** food | **10,240** livability — tied |
| Secondary | **+ 2,560 happiness** | **none** |
| Cost | **40,960 data** | **35,840 data** |

**They are distinct now, on two axes, and neither dominates.** The Homes win on cost by 5,120; the
Farm wins on mix by 2,560 happiness; footprint and magnitude tie. **It took two numbers rather than
one** because at equal footprint and equal magnitude a single axis can only ever favour one row, so
either number alone would have left the *other* row dominated.

**The history, since the numbers only make sense with it.** The pooled-aggregation ruling made
housing and food one pool, which for one afternoon left both rows providing *the same 10,240 of the
same quantity on the same one cell* with the Farm 5,120 **cheaper** — a clean weak dominance, and
nobody would ever have built the Homes. The two numbers above put mix and cost back, which is Evan's
own *"separated by cost and mix"* criterion satisfied in its own words under the model as it now is.
**`test/eraCivicCatalogueDominance.test.ts` carries no exceptions list and no exceptions machinery
at this tip**, so all ten catalogues are swept with no hole — verified in the file rather than taken
from the prose.

**One thing the numbers do not fix, and it is the art's problem rather than the model's.** The two
rows are still **two slender single-cell towers of almost identical height** — ~21 units against
~22 — standing in the same catalogue. A player who cannot tell them apart on the buy menu will read
the numbers; a player looking at the city has only the silhouette. **Brief #11's table is the
answer**: pale translucent continuous column against dark gridded rack with projecting galleries. It
is a strong axis, and it needs to stay strong, because it is now the only thing distinguishing two
buildings the model has finished separating.

---

## Defects reported, not fixed

**None of these is corrected here, and this PR touches no era document.** Each is a disagreement
inside or between era ten's two files, found by reading the sections against each other as the
folder's known trap class requires. **The crossed node-id trap is clean** — see the verification
section — so everything below is a different class of disagreement.

**1. §5's per-mass plot list can be read onto era ten's own nodes, and it is not about them.** §5
opens *"The plots do not change"* and then gives plots per mass: *"the hall and the dwelling share
the square full plot; the store is the long two-cell strip; the yard is the two-cell strip on the
short axis; the workshop has a single tile; the landmark has the wide plot."* **Those are era
one's node footprints** — `NUM.S` 2×2, `NUM.F` 2×1, `NUM.4` 1×2, `NUM.3` 1×1, `town-hall` 3×2 —
and footprints are keyed by **node id** in `NODE_FOOTPRINTS`, never by mass. **All nine `TRG.*`
resolve to `DEFAULT_FOOTPRINT` 2×2**, which the same guide states correctly two sections earlier.
The two statements are in one file and the wrong one is the more specific-sounding. **It matters
most at `TRG.2`**, where *"the workshop has a single tile"* would have Drone Command authored on a
quarter of its plot. *(Era nine's brief reports the identical defect in its own guide, so this is a
folder-wide pattern rather than an era-ten slip — but era ten is the era with a form change riding
on it.)*

**And the trap is catching authors, not just readers.** Era three's brief, merged at `#263`, lists
its `store` node `LIN.4` at **2×1** and its `yard` node `LIN.5` at **2×2**. `NODE_FOOTPRINTS` holds
only the six `NUM.*` ids and `town-hall`, so **both resolve to `DEFAULT_FOOTPRINT` 2×2** — 2×1 is
`NUM.F`'s plot, taken from the per-mass list. Its own two entries are inconsistent with each other
in opposite directions, which is what the mass list does to a careful reader. **Reported as an
observation about another document rather than as a finding this brief has authority over**, and
recorded here because whoever runs the consolidated pass should know the sentence has now misled at
least twice.

**2. The `yard` subtitle names a different building from its own roster node, and this is the
folder's own worst-defect class.** The subtitle row gives `yard` = **the Deck**, and it is wired to
`TRG.1`, whose roster row authors *"a dish yard: fixed dishes bolted down on a **fenced** pad …
**nothing growing on it**"*, kept clear *"because the equipment demands it rather than because
anybody decided to keep it open."* **A deck is a public walking surface and this is a fenced
equipment compound.** The name comes from §5's *chain* dressing — *"the steerable dish yard **on
the deck**"* — which is the inherited instance and is never drawn.

**`eras/README.md` records four subtitles caught doing exactly this and corrected**, and names the
mechanism: *"The `Plaza` and `Campus Green` readings came from §5's **reference** dressing, which is
the inherited chain instance — but a row is wired to the node, and the node is the era's own new
building."* **Era eight's cell is the precise precedent**: it *"said `Plaza` over a pylon yard
behind a mesh fence"* and was renamed to *Substation* for it — and has since been re-authored as the
**Power Station**, a building rather than a yard. **Era ten's `yard` cell is a fifth
instance of the same defect and it is uncorrected** — and the settled rename carries it forward
rather than clearing it, since *the Neon Plaza* is *Plaza* over a fenced yard, which is era eight's
withdrawn cell almost exactly. **Reported, not fixed, and the name is used as settled throughout
this document.** The brief describes the fenced yard the roster authors, because the folder's own
finding is that a subtitle naming a different building *"is a worse defect than a generic name
because it sends the modeller the wrong way."*

> ## ✅ CLOSED 2026-07-30 — and it closed the way this defect *should* close
>
> **The team lead has ruled: a fenced equipment yard and a plaza are opposites, there is no reading
> that reconciles them, and `TRG.1` is re-authored as an actual plaza** — open ground, neon, people,
> inside its frozen 2×2. `era-10-cyberpunk/style-guide.md` §5's `yard` entry carries the form and
> **brief #1 above is rewritten from it.**
>
> **Note which way it went, because this section framed the choice as name-or-nothing.** Era eight's
> cell was the precedent cited here, and era eight fixed the mismatch by **renaming the cell to
> match the yard**; era ten fixes it by **re-authoring the building to match the cell.** Both are
> now internally consistent and they point in opposite directions, which is correct — era eight's
> `yard` genuinely is a building and era ten's genuinely is ground. **The folder's rule is that the
> two must agree, not which of them moves.**
>
> **This document's refusal to re-design was right and is not withdrawn.** *"A brief may not
> re-design a building to fit a proposed name"* is the correct standing rule; what unblocked it was a
> ruling, not a second opinion.
>
> **The one thing the ruling had to buy, since the old cell's reason for not moving was real.** The
> earlier reasoning was that a plaza would collapse into the chain's planted deck pad, *"which is the
> only thing separating the two."* It no longer is: the separation is now **equipment against
> people** — the pad is dishes, mounts and trays with planting as its evidence of deliberate
> openness, and the plaza is a bench-step, a rail and the people on them as its own. The guide's
> table answers eight further open grounds standing on the island, plus era ten's own Night Market
> and Nightclub.

**3. §3's height ranking is mostly about buildings that are never drawn, and it omits five of the
nine this guide owes.** The ranking has eight entries: *the comms tower, the capsule stack, the
second slimmer mast, the interchange hall and the plant stack, the data store and the signal lab,
and the dish yard lowest.* **Four of those name inherited chain instances** — the comms tower, the
interchange hall, the signal lab, and on §5's own reading the capsule stack — which the 2026-07-29
re-dressing ruling means are never drawn. **The ranking's tallest entry is one of them**, so era
ten's stated tallest building is not a building era ten draws. Meanwhile **`TRG.2`, `TRG.3`,
`TRG.7`, `TRG.8` and `TRG.9` appear nowhere in it.** §3 states that *"the ranking is what an era
owes, and it survives re-authoring"*, and this one did not survive the ruling. **This document
derives its own order** and says so. Two entries are additionally ambiguous — *the capsule stack*
and *the dish yard* each name a building §5 says exists twice on that mass.

**4. A claim the guide corrects at §"Notes before authoring" runs on as live prose 190 lines
later.** The CORRECTED banner quotes two sentences and rules on both: the first is *"the folder's
largest overstatement of a guide's job"*, and the second — *"It is also, per §12, the cheapest
guide in one specific sense: 'a Cyberpunk building is drawn once and barely needs a through-line at
all,' because nothing comes after it. The through-line work was front-loaded into era one"* — is
answered with *"The second is now true of every era, not just this one … this guide is no longer
distinctively cheap."* **That exact passage then appears again, unbannered, immediately after the
roster's 53-buildings note, reading as a live claim.** This is the trap the skill names by name: *a
withdrawn paragraph reads exactly like a live one.* **Anyone briefing from that page without
reading the top of the file will conclude era ten is cheap to draw, and it is the largest set in
the run.**

**5. §5's REFERENCE ONLY banner and the head banner disagree about the landmark.** The head banner
says the guide still owes **the Town Hall for this era**, since *"after the ruling the hall is the
only thing in the city that rethemes."* §5's banner says the treatment of *"every other mass"*
beyond the six the roster uses is reference and *"will not be built."* **The `landmark` entry in §5
is the only description of era ten's hub anywhere in the two files.** **Read as owed**, per the head
banner, and briefed as #10 above. *(Era nine's brief reports the identical disagreement in its own
guide.)*

**6. §2 claims era ten's emissive material is the first in the run that emits rather than reflects,
and that is true of materials tables and not of surfaces.** *"Era ten's fourth material is the first
in the run that emits rather than reflects."* No earlier era lists an emissive **material**, so the
claim is defensible as written — but **era nine already carries emissive surface** (a back-lit
signage band on a fascia, `EL.2`'s lit crown at the parapet, and a display panel showing a number
that changes), and era seven's Engine House shows its firebox mouth as an emissive surface inside
the model. **Era eight is the one era with none at all**, its §2 listing *"emissive surface of any
kind (Cyberpunk)"* among its explicitly absent materials. **So the absence era ten's light arrives
after is one era deep, not two**, and what is genuinely new in era ten is emissive promoted from a
fitting to a body material and used as *trim across every building*. Stated because an artist told
*"the first light in the run"* will over-light it, and this era's whole difficulty is restraint.

**7. The civic file gives world-unit heights where the style guide forbids them.** §3 states
heights *"as an order"* and *"deliberately gives no world-unit targets"*, with the mechanical
reason that a contain-fit means a number is not something a model author can aim at.
`civic-buildings.md` gives ~21, ~22 and ~8. **This document uses the civic figures only as the
relative order the civic file states.** *(Era two's and era nine's briefs both carry the identical
flag for their own files, so this is folder-wide.)*

**8. §3 says nothing but the inherited comms tower comes near the 24-unit ceiling; the civic file
puts The Pod Apartments at ~22, "at the ceiling."** *"The one thing in ten eras authored to brush the
24-unit ceiling, and the only thing that ever should be … nothing else in ten eras comes near it"*
against *"Height ~22 units, at the ceiling."* Era nine's Condominium is also ~22 and era eight's
Apartment Tower *"should sit close to the cap"*, so the claim in §3 reads as being about the era and
is at best about the skill set. **The two files should agree on which**, and the ceiling caps by
silently squashing, so a building authored at 22 is one authoring decision from being squashed
without anyone being told.

**9. The store chain's justification for *the Vault* rests on a chain with no drawn member in era
ten.** The subtitle row keeps *the Vault* because it *"names this era's recorded chain break — the
store's contents stop being visible"*, and `eras/README.md` lists it as one of three rows that name
a chain break out loud. But §5 says the **inherited** store instance is *"the one carrying the
chain, and the advertising front is what makes that true"*, and that instance wears era one's
clothes and is never drawn. So the building the name is about does not exist in era ten, while the
building the name is **wired to**, `TRG.5`, is the unmarked monolith. **The name happens to fit
`TRG.5` better than it fits the chain** — a blank sealed box with no signage is more vault-like than
an advertised one — so nothing needs doing to the art. Recorded because the *reasoning* recorded in
two files is about a building nobody will see.

**10. Six eras carry a subtitle over a mass their rosters do not occupy, and era ten is not one of
them.** Era nine's brief found four on `dwelling` — eras two, three, four and seven, none of which
has a `dwelling` node. Measured here across all ten rosters at `bc27f02`, **`tower` adds two more**:
**era four** (roster `POL.1 POL.2 POL.3 POL.4 POL.8`) carries *Lighthouse*, and **era six** (roster
`GEO.1 GEO.2 CG.1 POL.6 POL.7 RAT.5`) carries *Bell Tower*, and neither has a node on `tower`. So
six subtitles in the ten-era table name buildings that are never built, and **they are counted in
the 121-name one-namespace check**, which is measuring more names than the run can announce. **Era
ten is clean**: its nine nodes cover all six masses, so all ten of its dressings have a building
behind them. *(This is the correction that changes the tower lineage from five to seven — see the
two-towers judgement.)*

---

## Compressed, for prompting

*Every building in three to five sentences, at even depth. Each entry stands alone once the theme
brief and the constraint list above are prepended. The height ranking and the props are dropped
unless a prop is load-bearing for recognition; the silhouette, the load path in brief, the
materials that differ from the era default, the one detail that has to read, and the single
confusion to avoid are kept. **With a roster this size the last building deserves as much as the
first.***

**the Neon Plaza** *(re-authored 2026-07-30; until then it was a fenced dish yard, and until the
consolidated pass it was "the Deck")* — **skill**, `TRG.1` on `yard`, 2×2. An open square of
perforated metal deck and dark composite panel, continuous with the street, **with no fence, no
gate, no kerb and nothing standing on it at all** — at full zoom-out it reads as the one gap in a
city that is stacked everywhere else. Its whole content is level rather than object: a broad
two-riser terrace at one corner, a long bench-step deep enough to sit on down one side, and a lip
where the deck cantilevers past its structure and stops at a plain rail with no wall under it.
**The detail that has to read is an emissive line in every nosing** — terrace lip, each tread,
bench-step edge, the underside of the rail — so the plot reads as a few parallel lit lines lying
flat on the ground; **the deck panels themselves are dark, nothing is lit beneath them, and nothing
on the plot is lit by anything else: no glow, no bloom, no pool of light, the model drawable with
the strips switched off.** People standing at the rail and sitting on the step are load-bearing for
recognition. Keep every line straight and parallel to a plot edge — this node hosts degrees and
radians, and a round centre with radiating joints is a protractor. Do not let it resemble The
Nightclub, whose read is the ground glowing from a room below through grated slots: this deck is
solid, has no opening in it anywhere, and its steps go **up**.

**Drone Command** *(merged; until the pass the files read "the Chip Plant", and the FORM changes from a fab shop)* —
**skill**, `TRG.2` on `workshop`, 2×2. A squat blast-walled block, shut at ground and busy on its
roof: one thick unrelieved plane of seamed dark composite panel with a single vehicle-scale armoured
door and no other opening, carrying a flat launch-and-recovery deck ringed by a low parapet with
landing cradles in a rank and drones stowed nose-in on an open rack. The box lands on the deck as a
blast wall rather than as a frame with infill, with one canted operations gallery of dark switchable
glass bracketed off a single elevation at first-floor level and bracketed conduit climbing the wall
in the open to a corner mast of sensors. **The departure from the era default is an absence: no
signage stack and no animated display anywhere, in an era where signage is the entire
identification system, and that silence is the loudest thing about the building.** The detail that
has to read is the drone deck — cradles in a regular rank, each with an emissive edge strip, and the
rack of parked aircraft along the sheltered side — because it is the only thing that says *command
post* rather than *bunker*. Do not let it resemble era nine's Chip Factory: **the airlock snout and
the bunded gas store belonged to the fab shop this replaces and must not appear here.**

**the Hologram Theatre** *(merged; until the pass the files read "the Broadcast Studio")* — **skill**, `TRG.3` on
`hall`, 2×2. A wide low clad shed with a flat unbroken top edge and one long glazed gallery banded
across a single face, reading long rather than tall, with a stacked signage frontage at the entrance
end. New-built on the deck and landed on all four edges — which is what keeps it apart from its two
hall-mass siblings — with a clear span over one wide undivided volume and the gallery carried as a
projecting band on brackets rather than cut into the wall. **The departure is the glass: this is the
one building in era ten with a long continuous run of it**, dark and switchable, with one or two
lighter switched panes that should look deliberate. The detail that has to read is that the control
gallery is **occupied** — desks, racks and people visible behind the whole length of the band, angled
slightly out — because it is the only building in era ten you can see people working inside, and if
the glass reads as a blank darker panel the building is gone. Do not let it resemble the Stock
Exchange, which shares this mass and plot: that one is a floor plate cantilevered over the older
street with a soffit and an overhang, and this one is a shed sitting on the deck.

**the Signal Tower** *(merged; until the pass the files read "the Mast")* — **skill**, `TRG.4` on `tower`, 2×2. An
open steel lattice mast rising off a low clad equipment podium with drum antennas banded round it at
two levels, authored many times taller than it is wide because the square plot cannot supply the
proportion and a smaller one would only shrink the model whole. The podium holds the ground and the
lattice stands off it and ignores it, with conduit and cable risers bundled up one leg of the frame
in the open. **Unpainted dark steel lattice is the departure from a panelled era, and two pointed
absences carry meaning: no signage stack, because a mast has nowhere to put one, and no external
cage ladder, because §5 reserves the climb for the inherited comms tower that carries the chain.**
The detail that has to read is that **you can see through it** — sky visible through the
triangulation from every azimuth at full zoom-out — because a mast that reads as a solid shaft has
become era three's Stronghold or era seven's Water Tower, and the open frame is this chain's whole
invariant. Do not let it resemble the Broadcast Tower, its plot-mate: that one is a closed clad
shaft, and open lattice against closed mass is the separation.

**the Data Vault** *(merged; until the pass the files read "the Vault")* — **skill**, `TRG.5` on `store`, 2×2. A blank
sealed monolith with one horizontal louvred plant band across a single elevation and nothing else on
it, flat-topped and unbroken, authored emphatically longer than it is deep since the square plot will
not make it read long. One volume landed on the deck with its panel skin wrapped over every face and
no opening at all except a single service door, flat roof behind an upstand. **Aluminium louvre is
the only departure, and the absence is the point: no glass anywhere, and no signage of any kind — no
lit letters, no plates, no blades, no animated display — which in this era is very loud indeed, and
is the one prop §5 says the chain cannot do without.** The detail that has to read is that louvred
band against the flat panel either side of it, a stripe in an unstriped wall legible as a grain
change at full zoom-out, because it is the only thing on the building suggesting anything is inside
it. Do not let it resemble era nine's Data Centre, the sharpest cross-era pair era ten has: **era
nine's silhouette is a rank of chiller drums standing proud of its parapet, and nothing whatever may
stand above this one's.**

**the Broadcast Tower** *(merged; until the pass the files read "the Rooftop Mast", which they author as a second
lattice mast)* — **skill**, `TRG.6` on `tower`, 2×2. A closed, gently tapering clad shaft rising off
an older building's roof with a banded drum of transmitter galleries at its head, and beneath it the
kept older building visible as a whole silhouette of another era's architecture. It straddles rather
than lands: a new bracketed frame sits on the old roof and carries down past the old parapet on
visible external legs, with guy wires anchoring from the shaft's upper third to the old roof and the
deck beyond. **A narrow vertical slot of dark glass at the galleries is the only aperture, and the
guy wires are the departure worth protecting — they are the one thing in era ten that draws a
straight line through open air, and they carry this mass's *open frame* invariant now that the shaft
itself is closed.** The detail that has to read is the older building underneath and the joint: a
parapet line that does not match, a floor level that does not match, a material that is not dark
composite panel, with the new legs standing on it — because if the older fabric reads as a podium
this has become the Signal Tower with a base. Do not let it resemble the Signal Tower: **open
lattice against closed clad shaft is the axis, and the two must not both be lattice.**

**the Robotics Lab** *(merged; until the pass the files read "the Rooftop Lab")* — **skill**, `TRG.7` on `workshop`,
2×2. One low storey of dark glass straddling an older roof, wider than it is tall, with an open
railed antenna deck of test rigs beside it and the kept older building carrying both. A bracketed
frame on external legs off the older structure rather than a building on a base, with the old
parapet, the old roofline and a mismatched floor level all visible through and under it. **Dark
switchable glass over the whole storey is the departure — this is the era's glass building — and the
pointed absence is the animated display, which §5 makes the separating axis because it is all this
broken chain has left and it cannot be shared.** The detail that has to read is the **daylight under
the new storey**: the gap between the new floor and the old roof open and visible from every azimuth,
with brackets, legs and services crossing it, so the plot reads as two buildings of different ages
with one standing on the other — the run's clearest single image of retrofit. Do not let it resemble
Drone Command on the same mass: glass straddling a roof against a blast wall standing on the deck.

**the Stock Exchange** — **skill**, `TRG.8` on `hall`, 2×2. A deep slab of trading floor
cantilevered out over the older street below, with a lit line running the whole length of its
underside; the overhang is the silhouette, because one edge of this building has no ground under it
at all. New-built on the deck on its own structure — a retrofit would collapse the distinction that
keeps three hall-mass buildings apart — with one deep undivided floor inside and the far edge running
out over the void as an overhang and a rail. **Three register cues are named in the guide and all
three must be present: seamed dark composite panel with its fixings left visible, bracketed cable
risers climbing the elevation in the open, and an animated board of moving figures facing the deck.**
The detail that has to read is the emissive reveal running the full length of the soffit beneath the
cantilever — bright in itself, lighting nothing, no pool on the street below and no glow on the
underside beside it — which is the era's signature move at its clearest. Do not let it resemble the
Hologram Theatre: one is a slab of floor and the other is a shed, and **the cantilever is what must
never be dropped from this one.**

**the Quantum Core** *(merged; until the pass the files read "the Module Stack", and the FORM changes from stacked
living capsules)* — **skill**, `TRG.9` on `dwelling`, 2×2. A low broad sealed shell standing clear
of the deck on a rank of squat anti-vibration mounts, wider and deeper than it is tall, with a field
of finned heat-rejection units ranked across its flat roof and a continuous band of air running
underneath it. It touches nothing: the mounts are visible objects, the gap is open all the way
through from any azimuth, and there are no galleries, no walkways, no modules and no windows.
**A cryogenic plant rack of ducts, headers and vessels bracketed along one long elevation is the
departure, and the absences are total — no signage stack, no animated display, and one deep-set
inspection reveal of switchable glass as the only opening in the building.** The detail that has to
read is the **band of air underneath**, because every decision here is one idea — a machine that
fails if anything touches it — and the gap is the cheapest and most legible carrier of it; behind
the reveal, the suspended cylindrical cryostat should read as a shape rather than as a detail. Do
not let it resemble The Pod Apartments, which is the building this node used to be: a lit capsule
rack with galleries and layered signage against a blind machine hall with none of the three.

**the Steam Vent** — **hub**, `town-hall`, 3×2 (the wide plot). A lit plant stack rising through the
deck with a field of gratings breathing steam at its foot and people standing at them, wide rather
than tall with all of the height in the stack. It comes up **through** the walking surface rather
than standing on it, so the deck is cut around it and meets the building at a grating, with a low
clad plant base spreading across the rest of the plot and bracketed ducts and risers climbing the
stack in the open. **One emissive band round the stack and lit strips along the grating edges are
the only lit surfaces, and the steam is geometry and tone only — it is not lit, it does not glow,
and nothing is lit by it.** The detail that has to read is **people standing at the warm grating,
because it is the only warm place on a cold deck**: era one's Great Hearth was a stone ring people
stood at, and ten eras later the fire has become a boiler, a plume, waste heat and now an exhaust,
with people standing at it to keep warm again — the tenth and last link in the *sheltered communal
fire* through-line. Keep the stack singular, tall and public; if the plot reads as roof plant on a
low building it has become the machinery it is meant to be the civic face of.

**The Vertical Farm** — **civic**, the **food** row, 1×1. A slender tower of stacked growing trays
behind translucent panels with water tanks at its crown and a service core carrying an external lift
up one face, authored several times taller than it is wide on the smallest plot in the era. A steel
frame carries the trays floor by floor inside a wrapped polycarbonate skin, with the core expressed
on one face and the lift running outside it. **This departs from the era default further than any
other building here: translucent pale polycarbonate instead of dark composite panel, an expressed
steel frame instead of a panelled shell, and a pink-white emissive grow-light — the only pale
building in era ten, and that is the point.** The detail that has to read is **green, visible through
the panels at the locked tilt from any azimuth**, because the 2,560 happiness is the luxury of fresh
food in a city that otherwise eats out of vending banks and a tower reading as a chemical plant is
claiming an amenity the player cannot see; the grow-light is an emissive surface that lights
nothing, with no bloom at the panel edges and no coloured cast on the deck or on its neighbours. Do
not let it resemble The Pod Apartments, its tied dominance partner: **pale translucent continuous
column against dark gridded rack with projecting galleries.**

**The Pod Apartments** *(merged; until the pass the files read "The Capsule Homes")* — **civic**, the **livability**
row, 1×1. A dark steel rack full of small lit rectangles with open mesh walkway galleries running
across its outer face at every level, tall and narrow on a single cell, and no crown at all — the
rack simply stops. The rack is the architecture and the capsule modules are the infill, sitting in
the frame as clearly separate objects, with exposed services climbing one side in the open and the
galleries on their own brackets. **The departure is that the modules read as separate objects in a
frame rather than as a wrapped skin, with signage layered over everything.** The detail that has to
read is that **every module has one small window and it is lit** — a grid of small emissive
rectangles, each bright in itself and lighting nothing, no glow around any of them and no cast on
the galleries — because that grid is the whole of what says people live here on a building with no
lobby and no green; and **draw it dense, lit and inhabited rather than as squalor**, since cyberpunk
density is period texture and never an accusation. Do not let it resemble era eight's Apartment
Tower or era nine's Condominium, the other two single-cell civic housing shafts standing forever in
the same city: **frame-and-balcony against rack-and-capsule**, and era ten's is the only one of the
three whose dwellings are visibly separate objects.

**The Night Market** — **civic**, the **happiness** row, 3×2. A slack tensile fabric canopy on steel
masts over a floor of free-standing stalls on wet paving, with dense hanging signage beneath it and
seating at low tables, reading as mostly covered ground rather than as a building from every azimuth.
The canopy is in tension and the masts in compression and nothing else on the plot carries anything;
there are **no walls**, so the six cells are visible straight through in any direction. **Tensile
fabric is the departure and it is the only soft material in era ten and the only thing in the era
that curves without being a machine.** The detail that has to read is the **density of many small lit
signs with people seated among them** — layered neon and hanging plates spread across the whole plot
rather than one big plane, steam and cooking smoke rising through the fabric, reflections in the wet
floor as a flat tonal material read and never a mirrored gradient, and every sign an emissive surface
that lights nothing. Do not let it resemble The Nightclub, which shares its era and half its name:
**open canopy against closed slab**, and this is the one with no walls.

**The Nightclub** *(merged; until the pass the files read "The Reservoir", and the BUILDING changes from a covered
reservoir)* — **civic**, the **blend** row, 2×2. A low blank slab, shut on every face but one, with
a single lit blade projecting off its frontage and a line of people standing along its edge —
deliberately the lowest building in the era, so it reads as ground rather than as another tower and
is the only civic here that does. One sealed volume landed on the deck with its panel skin wrapped
over every face, one deep-set entrance recess, a shallow overhang along the public edge, and a flat
roof behind an upstand carrying ventilation plant. **The departure from the era default is how
little there is: no glass, no stacked signage, and exactly two emissive surfaces — the blade sign
and the soffit line — both bright in themselves and lighting nothing.** The detail that has to read
is the **public frontage, and it is load-bearing for the building's own numbers**: free water points
and heated seating set into the street edge under the overhang, lit from the soffit through grated
slots, with people using them without paying — because the 5,120 livability has to be visible or the
building is claiming a capacity the player cannot see, which is precisely the objection this row
carries on record. Do not let it resemble The Night Market: this is a solid block with a queue
against it, and that is a translucent lid over visible activity.

---

## Gates

- **Biome is VACUOUS here, and that is read from the config rather than from a run.** `biome.json`
  excludes `output/**` and Biome does not lint Markdown, so this PR's one file is outside the
  linter's population twice over. **Reported as vacuous, never as a pass.** *(Note for anyone
  repeating this: `npx biome` in a fresh worktree resolves to an unrelated registry package that
  exits 0 on everything, so its output is not evidence of anything.)*
- **No test suites were run, and the reason is that there is no code change.** This PR adds one
  Markdown file under `output/imagegen/` and changes nothing else. `git diff --name-only
  origin/integration` lists that one path.
- **No era document is touched.** Renames are batched into a separate consolidated pass and another
  worker is in the era folders; every renamed building here is flagged with the pre-pass file name beside
  it, per the skill's Step 3.

---

## Related

- `era10-cyberpunk-concepts.jsonl`, in this folder — **the fourteen generation prompts for the
  fourteen buildings above**, one line per plate, in this document's own building order, each
  keyed to the `out` filename it writes and each carrying the theme brief, the constraint list and
  one entry from *Compressed, for prompting* folded into a single paragraph. It is committed here
  rather than left in scratch because it is the only thing this era's art could be regenerated
  from. Every job is an independent text-to-image call with no image reference embedded, at
  `gpt-image-2`, 1024×1024, quality `high`, `use_case: stylized-concept`. Run it with
  `python3 ~/.codex/skills/.system/imagegen/scripts/image_gen.py generate-batch --input
  output/imagegen/era-10-cyberpunk-building-briefs/era10-cyberpunk-concepts.jsonl --out-dir
  output/imagegen/era-10-cyberpunk-building-briefs --concurrency 3`. **Generation costs money and
  nothing in this folder has been generated yet**, so add `--dry-run` unless a run has actually
  been decided.
- `docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md` — the era in one line and its
  signature move, materials, structural language, ornament, the roster, the seven masses, the three
  closures, the island, the palette, the construction stages, the props kit, the subtitle row, the
  advisor and the lesson framings.
- `docs/superpowers/specs/eras/era-10-cyberpunk/civic-buildings.md` — the four bought types, their
  footprints, costs and contributions, the `data` resource, and the dominance ruling.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0 — the nine hard constraints
  every era inherits, and §6 for the frozen footprint table.
- `docs/superpowers/specs/eras/README.md` — the ten eras, the naming rule, the one-namespace check,
  the cross-era subtitle table read down a column, the blend-row family, and the eleven shared-mass
  pairs.
- `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md` — the no-re-dress ruling this
  document's cumulative scoping follows from.
- `output/imagegen/era-09-information-building-briefs/README.md` — era nine's brief, read in full as
  the adjacent era; its six cross-era pairs and its circular-form cap are answered above.
- `output/imagegen/era-07-industrial-building-briefs/README.md`,
  `output/imagegen/era-08-atomic-building-briefs/README.md` — read for the cumulative confusion set.
- `packages/skill-graph/src/eras.ts` — `ERA_SEQUENCE`, the authority for the node set and for the
  tower and housing lineage counts.
- `apps/web/src/city/worldLayout.ts` — `NODE_FOOTPRINTS`, `DEFAULT_FOOTPRINT`, `footprintFor` and
  `MAX_BUILD_HEIGHT`.
- `apps/web/src/city/buildingAssets.ts`, `apps/web/src/city/eraDressing.ts` — the stable names and
  the `"{stable}, {subtitle}"` announcement string.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produced this document.

