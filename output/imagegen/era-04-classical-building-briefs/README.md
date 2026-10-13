# Era 04 — Classical building briefs

Image-generation briefs for the ten buildings era four owes: **five skill buildings**, **the
hub**, and **four civic buildings**. Written with the `era-building-briefs` project skill from
the era's own two documents, plus the one guide that carries the hard constraints:

- `docs/superpowers/specs/eras/era-04-classical/style-guide.md`
- `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md`
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0, for the nine hard
  constraints every era inherits, and its §6 for the frozen footprint table

**Eras one, two and three are not re-briefed and are not owed.** Since the 2026-07-29
re-dressing ruling a skill building is drawn once and keeps that look for the whole run, so
the sixteen buildings already standing keep their own eras' looks and nothing re-dresses
them. The only building that rethemes is the hub.

**But those sixteen are still standing on the ground era four builds on**, which is why the
*What it must not resemble* line in every brief below is **cumulative** rather than scoped to
this era. An era-four city physically carries era one, two and three as well. The full scan and
its results are under **The cumulative confusion set**.

**The era's material id is `silver`.** Renamed from `silver_coin` on 2026-07-29 by the
recognisability ruling, and the old id now survives only inside that rename banner and the
before/after table at `2026-07-29-era-resource-model-design.md` §4.1a. Nothing at the tip uses
`silver_coin` as the live id.

---

## Two names below were PENDING — both are MERGED now

> ## ✅ MERGED. The pending flags below are CLEARED, and one more building changed with them
>
> **The consolidated rename pass has landed and the era documents now agree with this brief.** Both
> names below are live in `docs/superpowers/specs/eras/era-04-classical/style-guide.md` and in
> `eras/README.md`'s cross-era table, so **nothing in this document is pending any more** and an
> artist opening the files will find the same names they find here.
>
> **The flag this brief raised about the roster description is CLOSED, in the direction it did not
> choose.** It reported that renaming the dressing *"leaves the roster description untouched, at
> which point the roster still calls the building a measuring and dividing workshop while its
> announced name says Surveyor's Shop"*, and left the two extra edits **flagged, not made**. **The
> lead ruled that the rename applies everywhere, including the roster description**, so the roster
> line, §5's echo and `NODE_FOOTPRINTS`' comment all now read **a surveyor's shop**. The word
> *measuring* is retired from this building.
>
> **The collision this brief flagged is CLOSED too, and from the other side.** It reported
> *Surveyor's Shop* against era six's **the Surveyors' Yard**. Era six's `yard` cell is now **the
> Mapmakers' House**, renamed in the same pass, so the two share no word.
>
> **⛑ AND ONE BUILDING IN THIS BRIEF IS NO LONGER THE BUILDING THE FILES AUTHOR.** `POL.2` was
> re-authored in the same pass from **the Stone Yard** into **the Barracks**, era four's entry in the
> lead's defence lineage — a FORM change, inside the same frozen 2×1 plot. **Brief #2 below is
> re-authored to it** and every cross-reference to the Stone Yard in this document is corrected. The
> guide's §5 yard entry is the authority.

**The team lead changed two era-four names and this document used them before they merged.** *(That
state is over — see the banner above. The table is kept as the record of where the strings were.)*

| Used here | What the files said at `3095767` | Where the old string appeared |
| --- | --- | --- |
| **the Custom's House** *(now merged)* | **the Custom House** | 5 places in 3 files: `era-04-classical/style-guide.md` subtitle row and its rationale bullet; `era-04-classical/civic-buildings.md` in the Grain Dock's naming banner; `eras/README.md` cross-era `hall` row and its *-House* census |
| **the Surveyor's Shop** *(now merged)* | **the Measuring Shop** | 4 places in 2 files: `era-04-classical/style-guide.md` subtitle row, its rationale bullet, and the "least happy with" flag; `eras/README.md` cross-era `workshop` row — **plus the roster description and §5's echo, per the lead's ruling** |

### "measuring shop" is BOTH a name and a description, and it is neither one exactly

The lead gave this one in lowercase, so it was worth establishing what it actually is.

- **It is a proper-noun dressing.** *the Measuring Shop* is `POL.8`'s capitalised subtitle in
  the **subtitle row**, which is the row ratified for wiring into
  `apps/web/src/city/eraDressing.ts`, and it is carried in the folder-wide cross-era table.
  This is the string the rename is really about, because a subtitle **enters the accessible
  name**.
- **It is also a roster description, in different words.** The roster line for `POL.8` reads
  *"A measuring and dividing workshop, long benches, graded rules and rods on the walls"*, and
  §5 echoes it as *"`POL.8`'s measuring and dividing workshop is the third"*. Those are lowercase
  running prose describing the building, not naming it.
- **The literal lowercase string "measuring shop" appears nowhere in the repository.** So the
  lead's rendering matches the *dressing* case-insensitively and does not match the roster
  description, which is the longer phrase *measuring and dividing workshop*.

**What that means for the consolidated pass:** renaming the dressing to *the Surveyor's Shop*
moves 4 strings and leaves the roster description untouched, at which point the roster still
calls the building a *measuring and dividing workshop* while its announced name says
*Surveyor's Shop*. Those two can coexist — a dressing names a building and a roster line
describes it — but if the intent was to retire the word *measuring* from this building
altogether, the roster line and §5's echo are the other two edits. **Flagged, not made.**

> **✅ RULED AND MADE.** The lead's answer was the second reading: **rename it everywhere, including
> the roster description, so the references stay consistent.** All three sites now read **a
> surveyor's shop** — the roster line, §5's echo, and `NODE_FOOTPRINTS`' comment in
> `apps/web/src/city/worldLayout.ts`, which this brief had not counted. **Nothing in the building
> moved**: the long benches and the graded rules and rods are unchanged, and so is §5's separator —
> `POL.8` is still the enclosed one.

**One collision the rename introduces, and it is worth a look before it lands.** Era six's
`yard` subtitle is **the Surveyors' Yard** (`CG.1`), carried in era six's own subtitle row and
in the cross-era table. *Surveyor's Shop* and *Surveyors' Yard* put the same distinctive word in
two eras' name columns, and the naming rule the second pass was written against is precisely
that a name must not blur into its neighbours when all 102 are read down the column at once.
The word suits era four on the merits — the era's advisor is a harbour architect who carries a
**groma**, the era's surveying instrument, and `POL.8`'s walls are hung with graded rules and
rods — so this is a note for the lead rather than an objection. **The rename that does not
collide is the one already accepted:** era four holding *Custom's House* beside *Senate House*
keeps the same-era *-House* pair the folder README already names and accepts.

> **✅ CLOSED, and from era six's side.** The lead renamed era six's `yard` cell to **the Mapmakers'
> House** in the same pass, so *Surveyor's Shop* now shares no word with anything in the run. **The
> word this brief argued suited era four on the merits is now era four's alone.**

**Neither rename reaches code.** `apps/web/src/city/eraDressing.ts` carries only the
`prehistoric` row; eras two to ten are markdown-only until their rows are wired.

---

## The roster this brief was written from

Node ids verified against `ERA_SEQUENCE` in `packages/skill-graph/src/eras.ts`, where
`classical` reads `["POL.1", "POL.2", "POL.3", "POL.4", "POL.8"]` — **an exact match with the
roster table, all five.**

| Node | Mass | Plot | What the roster says it is | Subtitle |
| --- | --- | --- | --- | --- |
| POL.1 | `workshop` | square full, 2×2 | A mason's workshop, open colonnaded front, blocks on trestles, chisels racked behind | the Stonecutters' Shop |
| POL.2 | `yard` | long, 2×1 | **A barracks:** a long single-storey range of soldiers' cells behind an arcaded veranda, a walled drill ground at one end, arms racked in the shade | **the Barracks** |
| POL.3 | `hall` | square full, 2×2 | A basilica hall, aisled, clerestory above the side ranges, apse at one end | **the Custom's House** |
| POL.4 | `store` | long, 2×1 | A bonded warehouse, barrel-vaulted bays opening onto a loading platform | the Wine Cellars |
| POL.8 | `workshop` | square full, 2×2 | A surveyor's shop, long benches, graded rules and rods on the walls | **the Surveyor's Shop** |
| — | `town-hall` | wide, 3×2 | The public hearth: a colonnaded court enclosing a raised stone hearth | the Senate House |

**Plots come from the guide's own footprint closure block**, which authors them for the five new
nodes because INV-ERA-1 fixes them forever and an unauthored footprint was blocking the art:
*POL.1 and POL.8 both take the square full plot; POL.2 takes the long plot; POL.3 takes the
square full plot; POL.4 takes the long plot.* Cell counts are era one's §6 table, the only copy:
the square full plot is 2×2 (8×8u), the long two-cell strip is 2×1 (8×4u), the wide plot is 3×2
(12×8u).

**Each node's mass in that block was checked against the roster table and all five agree.** This
is the trap era two shipped — three of five node ids crossed against their masses in the same
kind of block — and era four does not repeat it.

---

## The theme brief

*Read once. Every building below inherits all of it, and none of them restates it.*

Era four is **a small port city built to a line, in cut stone, out of one bay repeated.** The
signature move is that bay: the arch and the colonnade are the same idea — **a single module
counted along a wall** — so a building stops being a shape with holes in it and becomes a
number of somethings, and this is the first era in the run where the decoration and the
structure are the same object, because removing the columns would drop the roof. **Four
materials and no more:** dressed ashlar limestone laid in lime mortar as the primary body, pale
and flat-faced, its joints thin and level enough that a wall reads as assembled from equal
blocks rather than piled from found ones, with marble sitting inside that material as an accent
only — a threshold, a column drum, an inscription panel — and never as a whole body; terracotta
roof tile on every roof, pan-and-cover with an ordered ridge line and antefixes at the eaves,
the era's one strong colour and era one's body hue demoted from wall to tile; lime plaster and
stucco on upper storeys, inside colonnades and on the cheaper walls, kept close to the body hue
and just off-white, reading as a surface with nothing to hide rather than as a render pretending
to be stone; and the timber roof truss, visible at gable ends and under eaves, the one place the
era admits it is still working in wood. **This era ends the longest withholding in the run** —
lime mortar, the true arch and dressed ashlar were each held back by the three eras before it,
and the fired roof tile with them, every one of those guides naming this era as the one it was
saving for — so the arrival has to be worth three eras of restraint, and the way to spend it is
on the transition itself: the moment a wall's joints go thin and level, the whole island looks
intentional. Buildings **stand up by geometry, and the geometry is on the outside**: a load is
gathered into a column, carried across an opening by a semicircular true arch of voussoirs and a
keystone, and spread by a triangulated timber truss, with the vault used sparingly, the
peristyle turning a colonnade inward round a court, and **true symmetry worked in both
directions** — the camera orbits, so an axis may never buy a decorated face and a blank rear.
Ground is **paved**: fitted slabs laid to a camber with a raised kerb and a gutter beside it.
**One body hue for the whole era — dressed ashlar limestone `#D2C8AA`** — with terracotta roof
tile `#B4674A` as the accent, sitting on the calm parchment ground `#ECE4D3` rather than
competing with it; buildings share the body hue and differ by **silhouette plus accent**, never
by a second body colour. This is **the first pale era, after three eras of earth**, and that
break is the single largest thing separating anything drawn here from anything already standing
on the island. **Ornament is moderate for the first time and the whole of the increase goes into
the order** — the column, its capital, the entablature above it and the pediment that closes a
gable, a system rather than a set of decisions, which is why it survives being repeated across
the era without becoming noise. Everything else stays thin: a moulded string course, a cornice
with a real shadow under it, antefixes along an eaves line, and the cut inscription panel, which
is this era's tally descendant and the first link in that chain that is unmistakably *writing*
rather than counting. **A colonnade reads at zoom-out and a frieze does not**, so spend on the
profile of a cornice and never on surface: where a building needs to look richer it gets a
deeper cornice or another bay, not more carving. **Absent on purpose, because each is a later
era's signature move:** the pointed arch and the buttress, which the Medieval era owns; the
timber frame expressed on the outside of a wall, also Medieval, which is why this era's stucco
is never divided into panels by visible studs; the dome on a drum, which is the Renaissance's
whole announcement; **window glass at any size**, also Renaissance, so every opening here is a
shutter, a grille or a void; and structural iron, which waits for the Industrial era — iron as a
tool or a lifting cramp is period-correct, so a crane hook may be iron and a beam, a column or a
truss may not.

### Constraints that bind every image below

- **Three tone steps per surface under one key light** — top face lightened, the hue on the
  left, the right darkened. **No runtime lights**: no cast shadow, no ambient occlusion, no
  specular highlight, no rim light, no gradient. Never describe a building by light falling on
  it.
- **Emitted light is an emissive surface inside that model, never a light added to the scene.**
  The hub's hearth and the Baths' furnace end are bright in themselves and light nothing around
  them. No warm pool on the paving, no glow on a column.
- **Footprints are frozen** (INV-ERA-1). Design to the plot named in each brief; never change
  which cells a building occupies. **The mesh fills 95% of its footprint span** — sized to the
  plot, not floating in it.
- **Height is a ranking, never a world-unit target.** A model is contain-fit to its plot by one
  uniform scale, so the more slender of two neighbours is simply the taller one, and a smaller
  plot shrinks a model whole rather than making it look tall. **Slenderness is a property of the
  model.** The ceiling is 24 units and nothing in this era approaches it.
- **Every building is modelled at its finished (`built`) stage.** Not the setting-out floor, not
  the scaffold and crane, and not a mastery variant — mastery rides above a building as stars.
- **Mastery gold `#FFB703` is reserved.** It may never be a material and a body is never gold.
- **Every side must read.** The tilt is locked at ~49° and the azimuth orbits a full 360°, so
  there is no front and no hidden back. This bites harder here than in any earlier era, because
  era four is the first with a designed axis.
- **Silhouette first.** One dominant shape plus one accent, legible at maximum zoom-out.
- **No rebuses**, and this era's own guide names four specific watches because its mathematics
  is *areas as products* and its architecture keeps almost drawing one:
  - **POL.1's blocks and POL.2's stacked courses** must be part-worked and unequal and **never a
    rectangular array**.
  - **POL.4's vaulted bays** are a rhythm counted along a length and must never read as a square
    being closed up: **no four-sided arrangement of bays, and no odd bay set apart to finish
    one.**
  - **POL.8's rules and rods** are tools in a rack and never a graduated scale running the
    length of a wall.
  - **Any paved ground** takes slabs of varied and unequal size in courses that break and
    restart, worn unevenly and interrupted — never a regular array and never a paving pattern
    that could be read as a multiplication.
- **Nothing carries meaning by art alone.** The canvas is `aria-hidden`; every state a player
  must know is already in the DOM.

---

## The ten buildings

| # | Building | Class | Node / role | Plot |
| --- | --- | --- | --- | --- |
| 1 | the Stonecutters' Shop | skill | POL.1, `workshop` | 2×2 |
| 2 | **the Barracks** *(re-authored from the Stone Yard)* | skill | POL.2, `yard` | 2×1 |
| 3 | **the Custom's House** | skill | POL.3, `hall` | 2×2 |
| 4 | the Wine Cellars | skill | POL.4, `store` | 2×1 |
| 5 | **the Surveyor's Shop** | skill | POL.8, `workshop` | 2×2 |
| 6 | the Senate House | hub | `town-hall` | 3×2 |
| 7 | The Grain Dock | civic | food | 2×2 |
| 8 | The Cottages | civic | livability | 1×2 |
| 9 | The Baths | civic | happiness | 3×2 |
| 10 | The Fountain | civic | blend | 1×1 |

### The era's height order, tallest first — and it is derived, not quoted

**The guide's own ranking cannot be used as it stands, and this needs saying rather than working
around.** §3 ranks seven buildings — harbour tower, tholos market hall, public hearth, courtyard
block, market colonnade, portico, paved court — and **six of those seven are the chain dressings
that the re-dressing ruling means will never be drawn.** The only ranked building era four
actually builds is the hub, which §3 places third, *"wide but now genuinely monumental"*, above
the courtyard block and below the market hall. So the order below is **derived** from each
building's proportions, its plot and the guide's own statements about what it is, and the civic
figures are used only as the relative order the civic file states.

1. **The Cottages** — four storeys on a half-width plot, and the civic file calls it the tallest
   civic building in the run so far.
2. **The Baths** — a vaulted hall and a domed hot room, the era's centrepiece.
3. **the Custom's House** — a clerestory lifts the centre clear of the side ranges, which is what
   makes a basilica tall.
4. **the Senate House** (hub) — wide rather than tall by its own description, and monumental by
   width and by colonnade.
5. **the Stonecutters' Shop**, then **the Surveyor's Shop** — level with each other and both
   among the low buildings, with the Stonecutters' colonnaded front carrying marginally the
   higher eaves because a colonnade lifts a roof. Both stay squat and busy: the workshop mass
   fills its plot and rises barely above it.
6. **The Grain Dock** — deliberately plain and low under a shallow tiled roof.
7. **the Wine Cellars** — a long low range; both stores in this era keep the long low roof.
8. **The Fountain** — nothing on it above the two clipped trees.
9. **the Barracks** — **the shortest roofed building era four draws**: one storey, under the
   portico, and the only thing on the plot above it is the veranda's arcade. *(This entry read "the
   Stone Yard — its ground plane is the lowest in the era and does not rise, which is the yard
   chain's whole contribution to the run." **The yard CHAIN still never rises and still contributes
   exactly that** — it is REFERENCE ONLY and is not drawn — but `POL.2` is now a building, so the
   era's own yard-mass entry has a roof for the first time in the run. The guide's §5 carries the
   full correction and the four eras it reaches.)*

---

### 1. the Stonecutters' Shop — POL.1, `workshop` mass

**Plot: the square full plot, 2×2 (8×8u).** A working floor with a room behind it, so the plot
divides front to back rather than reading as one volume: roughly a third of the depth is
colonnade and open floor, the rest is enclosed working room.

**Silhouette.** A low ashlar block under a shallow pitched tiled roof with **a colonnade running
the whole of one face** and the work spilling out past the columns onto the paving. One dominant
shape, one accent: the block, and the counted row of shafts in front of it.

**How it stands up.** The colonnade is real structure — a row of stone shafts on bases, capitals
carrying an entablature, and the roof truss bearing on that entablature at the front and on the
ashlar wall at the back. Openings in the enclosed part are lintelled voids or grilles. The
paving under the open floor is fitted slab laid to a camber and running out beyond the columns.

**Materials and ornament.** Ashlar body, tiled roof, and the colonnade in the same limestone with
**one marble drum among the shafts** where a block has been reused. A moulded string course, and
a cornice profile deep enough to throw a shadow line. No frieze.

**Props.** Straight from the era's kit and all of it mason's work: a banker with a part-worked
block on it, bundled chisels, a square and a plumb rule, shear-legs for small lifts, a numbered
block waiting on the ground, chippings drifted against the wall. Chisels racked against the back
wall of the working room where they can be seen from outside.

**The detail that has to read: the work crosses the colonnade.** Blocks on trestles, tools and
chippings must spill past the columns onto the ground beyond, so the building reads as a floor
with a roof over it rather than as a small temple with a shed behind. It is open on **one** side
only, and that one side has to be unmistakably open.

**Rank.** Level with the Surveyor's Shop and among the era's low buildings; both sit below the
hub and well below the Custom's House.

**What it must not resemble.**

- **the Surveyor's Shop (#5), the other node on this mass** — the only within-era pair the folder
  README names for era four. They separate on **how much is open**: this one has a colonnaded
  front open on one side with the floor and the bench work visible from the street; that one is
  enclosed and is the one building of the pair whose floor you cannot see from outside. Props are
  the second tell — blocks and chisels against rules and rods — and never geometry.
- **Era three's Bronze Foundry (`LIN.3`, `workshop`, 2×2), and this is the sharpest cumulative
  risk in the set.** Both are open-fronted square workshops with equipment racked on a back wall.
  They separate on **fire and material**: the foundry has two smelting hearths with bellows, a
  charcoal store and a spoil of slag behind it, in ochre mud brick under a shingled timber
  canopy; **this building has no fire anywhere on it**, its front is a counted row of stone
  columns rather than an open gap, and it is pale limestone under tile. No plume, no hearth, no
  slag.
- **Era two's Potter's Kiln (`RAD.1`, `workshop`, 2×2)**, which is also a low working floor under
  a roof on the same plot. It is **mostly roof and air** — an open-sided thatch shelter on timber
  posts over a sunken kiln, with a plume. This is a walled room behind a rhythm, with no fire and
  no thatch.

---

### 2. the Barracks — POL.2, `yard` mass

> **⛑ RE-AUTHORED, and this is a FORM change rather than a rename.** The files used to author
> `POL.2` as **the Stone Yard**: *"a stone yard: sawn blocks stacked in courses, a timber shear-legs
> hoist, chippings underfoot"*. **The lead is adding a defence lineage, one building per era from
> era three onward, and era four's entry is this node.** The mass and the plot are unchanged and the
> new form is authored inside them, on era two's `yard` precedent. The lineage runs era three's
> Stronghold, **era four's Barracks**, era five's The Castle, era six's Cannon Tower, era seven's
> Cannon Factory, era eight's Nuclear Weapons Facility, era nine's Air Force Base and era ten's Drone
> Command. *(Era five's is the one civic in the line and needs no conversion; the other seven are
> skill buildings on nodes.)*
>
> **The old brief is not reproduced here** — it is in this file's history and in the guide's own
> record — but **its props survive**, because they were never `POL.2`'s alone: the banker, the
> part-worked block, the shear-legs, the numbered block and the drifted chippings are all in the
> era's §7 props kit and its §6 construction stage, so the era does not stop being a place that cuts
> stone.

**Plot: the long two-cell strip, 2×1 (8×4u).** `NODE_FOOTPRINTS` gives `"POL.2": { w: 2, d: 1 }`
and the closure block confirms it. **This is the load-bearing fact about the whole brief and it is
not 2×2**: a barracks drawn square would have to be two ranges round a court, and this is **one
long range one room deep**. Compose it as a **run**: work the length, not the centre.

**Silhouette.** A low single-storey range running the whole length of the plot under one
low-pitched tiled roof with a **straight unbroken ridge**, with **an arcade of semicircular arches
carried the full length of the front**. At one end, a **walled drill ground** held by a low ashlar
wall. **Nothing rises above the one storey** — no tower, no parapet, no crenellation, no gate arch,
and no pediment anywhere. The read is a long shaded colonnade with a roof on it, which is what the
locked overhead tilt sees best.

**How it stands up.** The arcade is doing structural work rather than ornament: it carries the
veranda roof and it is what shades the doors. Dressed ashlar to the veranda, lime-plastered rubble
behind it, a timber truss over the range. The drill ground's wall carries only itself, with a single
gate in it.

**Materials and ornament.** Pale ashlar and lime plaster under terracotta tile. **Ornament is
almost nothing**: the arcade is the whole of it, plus a plain string course and a cut inscription
panel over the end door. This era's ornament budget goes into the order, and here the order *is* the
structure.

**Props.** Spear shafts upright in a timber rack under the veranda, shields hung flat on the back
wall, a water trough cut from one block at the gate, a plain bench outside one cell, kit stacked
outside another and not the next. The drill ground is **compacted earth, deliberately not paved**.

**Nothing is aimed and nothing is in use.** No soldier, no drill in progress, no banner, no smoke.
The building is a garrison's quarters standing empty in the sun, which is the calm reading
`Game_Visual_Design_Brief.md` §2 requires and also the strongest one at this zoom.

**The detail that has to read, and it is a no-rebus requirement rather than a flourish.** **One row
of cells and never two.** No second storey, no wing returning at right angles, no grid of openings.
`POL.2` hosts *factoring* — reading a product back to its sides — and a rectangle of identical bays
is an area model, where a single line of them is a count along a length. **Vary the cells'
occupancy rather than their size** so the eye reads a row of rooms in use, and keep the drill ground
unpaved so a grid of slabs never sits beside a row of bays.

**Rank.** **The shortest roofed building era four draws** — below the portico and above nothing.
It rises, which the yard mass has not done before in this run, and the guide's §5 carries what that
corrects.

**What it must not resemble.**

- **Era three's Ingot Yard (`LIN.5`, `yard`, 2×2)**, the other open working yard on this mass.
  They separate on **verticality and plot**: era three's is open to the sky with **nothing on it
  above waist height** — a stone weighing table, a hand balance on a trestle, a banded weight
  chest — on a square plot, where this one is a long run with a hoist standing over it and is
  heaped rather than laid out. **One caution:** the shear-legs are era three's own hoist and
  appear in era three's props kit and construction stage, so the hoist alone will pull a reading
  toward the Bronze Age. Let the **pale sawn stone** carry the era and let the hoist be plain
  timber with no bronze strapping anywhere on it.
- **Era two's Sheep Pen (`RAD.2`, `yard`, 2×2)**, which is also a bounded working ground where
  nothing rises. It is **a fence and nothing else**, with hoof-churned earth and sheep as the
  tallest thing on it. This has no fence, no animals, and one tall hoist.
- **Era one's Clearing (`NUM.4`, `yard`, 1×2)**, the same shape of plot and also deliberately
  open ground. It is **swept**: cleared earth, a hearth ring, a few boulders, one tree. This is
  **heaped** — swept against heaped is the whole axis and it holds at any zoom.
- **the Wine Cellars (#4)**, which shares this plot shape. A roofed range of arches against an
  unroofed heap of stone; the absence of a roof is the strongest separator available and it needs
  no help.

---

### 3. the Custom's House — POL.3, `hall` mass

> **✅ MERGED.** The files read **the Custom's House**. *(They read **the Custom House** until the
> consolidated rename pass landed, and this brief carried the new name ahead of it. The building is
> unaffected either way and was drawable throughout.)*

**Plot: the square full plot, 2×2 (8×8u).** A long axial building on a square plot, so the axis
has to be made by **section and termination** rather than by a long thin plan: aisles down the
sides, a raised centre, and one end closed differently from the other.

**Silhouette.** A tiled pitched roof over a raised central hall with **lower aisle roofs flanking
it on both sides**, a pediment closing the entrance end, and **a half-round apse pushing out of
the far end**. The stepped section is the dominant shape and the apse is the accent.

**How it stands up.** Two rows of internal columns carry the central hall's walls; the aisles
lean against them under their own lower roofs; **the clerestory is the whole point of the
section** — a row of openings in the raised centre wall above the aisle roofs, carrying the
central truss above them. The apse is a half-dome over a semicircular plan. Every opening,
clerestory included, is a **void or a grille and never glazed**.

**Materials and ornament.** Ashlar body throughout, tiled roofs at two levels, a timber truss
whose end reads honestly in the pediment. Marble as a threshold and as **the cut inscription
panel over the entrance** — this is a harbour's business room and the panel is where its
authority is stated. A deep cornice profile at both roof levels, and antefixes along the aisle
eaves. No frieze, no relief, no acroterion.

**Props.** A mosaic threshold panel underfoot at the entrance doing the identifying, statuary on
a plinth beside the approach and one empty plinth, corded bales and tall jars along the aisle
wall, a loaded cart on the paving.

**The detail that has to read: the clerestory band.** The gap between the aisle roofs and the
raised centre wall, punched with openings, is what separates this from every other long hall on
the island. At zoom-out it reads as a pale stripe of light-and-dark above a lower roof, and it
must survive that far out.

**Rank.** Third, behind the Cottages and the Baths, and the tallest thing era four draws on the
skill side. The clerestory earns it.

**What it must not resemble.** **This building has three cumulative rivals rather than one,
because a long ridged hall has been built in every era so far — and one discriminator answers
all three.**

- **Era three's Merchants' Hall (`LIN.1`, `hall`, 2×2)**: mud-brick walls, a timber roof on a
  central row of posts, **wide doors at both ends** so carts drive through it.
- **Era two's Meeting House (`RAD.3`, `hall`, 2×2)**: one unbroken thatch ridge over a plain
  mud-brick box, **open at both gable ends** so you see straight through it.
- **Era one's Family Lodge (civic, 2×2)**: one long thatched ridge on battered earth walls with
  the eaves nearly touching the ground.

**All three are see-through or symmetrical end to end, and all three are single-level.** So the
separator is **termination and section**: this building is **closed at the far end by an apse**
and **stepped in section by a clerestory**, and neither of the other two has either. Pale ashlar
and tile against ochre brick and thatch is the second tell. Do not reach for a different roof
geometry.

- **the Surveyor's Shop (#5)** also stands as a closed ashlar box on a 2×2 plot in the same era.
  This one is stepped in section, has an apse and a pediment, and reads long inside its square;
  that one is a single low unstepped volume.

---

### 4. the Wine Cellars — POL.4, `store` mass

**Plot: the long two-cell strip, 2×1 (8×4u).** A row of bays counted along the length, which is
the plot's own shape: the length carries the rhythm and the depth is one bay deep.

**Silhouette.** A long low ashlar range under a shallow tiled roof, its whole length a **row of
semicircular barrel-vault mouths** standing on **a raised loading platform**. The rhythm of
arches is the dominant shape; the platform edge is the accent, a hard horizontal line under
them.

**How it stands up.** Each bay is a true barrel vault of voussoirs springing from piers between
the mouths, so the wall is carried over each opening by the arch rather than by a lintel. The
vaults take the roof load and the shallow tiled roof sits above them. The platform is solid
coursed masonry with a moulded coping, standing at cart-bed height.

**Materials and ornament.** Ashlar body and piers, terracotta tile, and lime plaster inside the
bay soffits where ashlar is not worth spending. A moulded string course at the springing line of
the arches, and a cut plaque over one bay. Nothing else — the arcade is the ornament, because in
this era the ornament and the structure are the same object.

**Props.** Sacks on the loading platform, corded bales, tall jars in rows with some sunk to the
shoulder in the paved floor inside a bay, timber stacked and sorted, a loaded cart drawn up
against the platform with ruts worn to it.

**The detail that has to read: the bays are shut.** Goods go straight from cart to bay and
**nothing is visible from the street.** Close the mouths — shutters, a grille, or the bay simply
running back into dark — and let the platform and the arch rhythm carry the building.

> **A contradiction in the source, and this is the one place a brief has to choose.** §5 gives
> this building's separating feature as being **shut**: *"the pair reads see-through against
> shut"*, with the chain's colonnade owning *contents on show* and this one being *"the opposite
> of it … nothing visible from the street"*. The **subtitle row's rationale bullet says the
> reverse** — that the Wine Cellars *"keeps the chain's contents on show in the open bays"*.
> **Briefed as shut**, on §5's authority, because §5 is the section that owns pair separation and
> because *shut* is what makes this building distinguishable at all. Reported under **Defects**;
> not this document's to close.

**No-rebus watch, from the guide.** This node hosts *completing the square*, so the bays are a
rhythm counted along a length: **no four-sided arrangement of bays, and no odd bay set apart to
finish one.**

**Rank.** Low and long, above only the Fountain and the Barracks.

**What it must not resemble.**

- **Era three's Treasury (`LIN.4`, `store`, long plot) — the sharpest cumulative collision in
  the whole scan.** Same mass, same long plot, adjacent eras, **both are bonded stores that read
  shut**, and era three's roster calls it a *"sealed bonded store"* against this one's *"bonded
  warehouse"*. They separate on **arch against lintel**, which is this era's own signature and
  the cleanest discriminator available: era three's is one lockable bronze-fitted door in a thick
  ochre mud-brick wall with no other opening along its length; this is **a row of semicircular
  arched mouths** in pale ashlar on a raised platform. One door against many arches, ochre against
  pale, and the platform as a third tell.
- **Era two's Seed House (`EXP.1`, `store`, 2×1) and era two's Granary (civic, 2×1)**, both of
  which are long stores **raised above the ground**. This is the exact-form collision the era-one
  and era-two scan was for, and it turns on **what the gap under the building is**: era two's are
  lifted on stone stumps with **clear daylight showing right under the floor**, which the era-two
  brief makes half the silhouette. This building's platform is **solid masonry with no gap at
  all**. Daylight underneath against a solid plinth.
- **Era one's Hide Shed (`NUM.F`, `store`, 2×1)**, the same long low shed on the same plot shape,
  with a **thatch ridge and an open gable end with hides rolled up in it**. Arched, tiled and shut
  against thatched and open-ended.
- **The Grain Dock (#7)**, in this era, which also has openings along one long side onto a paved
  apron. Neither of the era's own two documents separates them, so the axis is stated here: this
  is a **2×1 run of semicircular arched mouths** on a raised platform; the Grain Dock is a
  **squarer 2×2 box with rectangular lintelled doors** in a plain wall. Arch against door, long
  against square.

---

### 5. the Surveyor's Shop — POL.8, `workshop` mass

> **✅ MERGED.** The files read **the Surveyor's Shop** — and so does the roster, which now describes
> the building as **a surveyor's shop** rather than *a measuring and dividing workshop*. **This brief
> had flagged that second string and left it unresolved; the lead ruled the rename applies
> everywhere**, so all three sites moved together. The near-collision this brief reported with era
> six's **Surveyors' Yard** is also closed, from era six's side: that cell is now **the Mapmakers'
> House**. See the renames section above.

**Plot: the square full plot, 2×2 (8×8u).** Shared with the Stonecutters' Shop, so these two
separate on nothing the plot provides. Compose it as a single squarish volume with the length of
the benches running through it.

**Silhouette.** A single low enclosed ashlar box under a shallow pitched tiled roof, with a
**pilastered or engaged-column rhythm across its faces** and a cut inscription panel over the
door. One dominant shape, one accent: the plain block, and the rhythm laid across it.

**How it stands up.** Load-bearing ashlar walls carry a timber truss directly; the bay rhythm is
expressed on the wall as engaged shafts rather than standing free, which is how this era makes an
enclosed building agree with its colonnaded neighbours without becoming one. Openings are small
lintelled voids and grilles high in the wall.

**Materials and ornament.** Ashlar body, tiled roof, lime stucco on the upper part of one flank
where ashlar was not worth spending. **The marble inscription panel over the door is this
building's one piece of marble and its most important surface** — cut letters and numerals with
the shadow inside the cut doing the work, no pigment. A deep cornice, and antefixes on the eaves
line.

**Props.** Graded rules and rods **racked** on the wall, a marble slab still ruled out for
lettering, a smaller cut plaque, a folded rule and a square, and a stepping-stone crossing and
kerbed gutter on the paving outside.

**The detail that has to read: the racks are tools, not a scale.** The rules and rods hang in a
rack as instruments. **They must never become a graduated scale running the length of a wall** —
this node hosts long division and a wall marked off in equal units is a rebus.

**Rank.** Level with the Stonecutters' Shop and among the era's lowest roofed buildings. Squat
and busy.

**What it must not resemble.**

- **the Stonecutters' Shop (#1)**, its plot-mate and mass-mate. **Enclosed against open on one
  side**, and props second: rules and rods against blocks and chisels. This is the only building
  of the three workshops on the island's workshop plots whose floor you cannot see from outside,
  and that is deliberate.
- **the Custom's House (#3)**, the era's other closed ashlar volume on a 2×2 plot. That one is
  stepped in section with a clerestory and terminates in an apse; this is one unstepped volume
  with a flat roofline and no apse.
- **Era three's Treasury (`LIN.4`, long plot)**, which is the island's other deliberately
  unviewable box. **Plot shape does most of it** — square against long — with pale ordered ashlar
  against blank ochre mud brick, and a rhythm of engaged shafts where era three has one bronze-
  fitted door.
- **Era one's Tool Shelter (`NUM.3`, `workshop`, 1×1)** needs no argument beyond scale: it is a
  single tile and an open frame, and this is four cells and closed.

> **A contradiction in the source, and it lands on this building's single most important
> decision.** §5 authors `POL.8` as **enclosed** — *"long benches down its length, rules and rods
> in racks — and is the only one of the three whose floor you cannot see from outside."* The
> footprint-and-workshop closure block states a rule for **"the workshop mass"** that *"keeps at
> least one side open to the air in every era that can manage it"*, and adds that *"in this era
> that means a colonnaded front with the bench work visible from outside, and no cella behind
> it"* — and *bench work* is this node's own feature. **Briefed as enclosed**, per §5, because an
> open-fronted POL.8 collapses into POL.1 and destroys the only pair separation the folder README
> asks era four for. Reported under **Defects**; not this document's to close.

---

### 6. the Senate House — the hub, `town-hall`

**Plot: the wide plot, 3×2 (12×8u).** The era's landmark, unique by right, and **the one building
in the city that rethemes** — so this is the only place era four redraws something that already
stood. Use the width: a court needs depth as well as frontage, and this plot has both.

**Silhouette.** A **colonnaded court in ashlar and tile enclosing a raised stone hearth at its
centre**, open to the sky over the middle, with a portico across the entrance and worn paving
where people stand. Wide rather than tall. One dominant shape, one accent: the ring of columns,
and the hearth standing clear inside it with its smoke.

**How it stands up.** A peristyle — a colonnade turned inward on all four sides of the court,
carrying a tiled lean-to roof over the walk while the centre stays open. The portico across the
entrance is the same order, given a pediment and one more bay of depth so the approach reads
without a blank rear anywhere: **worked in both directions**, because the camera orbits. The
hearth is a raised platform of coursed masonry with a moulded coping.

**Materials and ornament.** Ashlar throughout, terracotta tile on the surrounding walk, and
**marble at the hearth platform's coping and threshold** — the one place this era spends marble
on the hub. A deep cornice round the court, antefixes along the eaves, and a cut inscription
panel in the portico. No frieze.

**Props.** Worn paving polished pale along the desire lines and rough at the edges, statuary on
plinths at two heights and one empty plinth, a public basin running continuously with an
overflow channel, a milestone or boundary stone at the entrance, a mosaic threshold panel
underfoot.

**Emitted light.** **The fire is never let out**, and it is an **emissive surface inside the
three-tone model**: the fire and the hearth's mouth are bright in themselves and light nothing
around them. No warm pool on the paving, no glow on the nearest column. This is the fourth
transformation of the hub's fire — era one gathered round it, era two shut it in an oven, era
three walled it into an industry, and here the city puts a colonnade round it and appoints
somebody to keep it alight. **The fire never goes out; it only becomes harder to see.**

**The detail that has to read: the centre is open and the fire is in it.** You look *into* this
building. The roof covers the walk and never the middle, and the hearth must be legible from
outside across the court at full zoom-out.

**Rank.** Fourth, and **wide rather than tall** — its authority is width, the colonnade and the
open centre, never height. §3 places it above the courtyard block and below the market hall.

**What it must not resemble.**

- **The Baths (#9), in this era, which shares the 3×2 plot and also pairs a colonnaded court with
  a fire.** Neither of the era's documents separates them, so the axis is stated here: **the fire's
  place in the plan.** Here the hearth is at the **centre of an open court and is the whole point
  of the building**, with nothing roofed over the middle. In the Baths the colonnaded court is
  subordinate to a large roofed vaulted mass behind it and the fire is a **furnace at one end**,
  off to the side and purely functional. A fire in the middle against a fire at the back.
- **Era one's Campfire (civic, 2×2)**, and this is a genuine exact-form collision from the era-one
  scan: a wide ring of undressed stone with a fire at the centre and the earth worn smooth and
  pale round it. **The plan is nearly the same idea.** They separate on **scale and verticality**:
  the Campfire is a knee-high ring on a smaller plot with nothing above about two units except a
  tally post, and no columns and no roof anywhere; this is 3×2, has a full colonnade with an
  entablature and a tiled walk, and a portico. A worn ring on the ground against a roofed
  colonnade round a court.
- **Era two's Bread Oven (civic, 2×2)**, the one other permanent communal fire still standing. Its
  fire is **a raised built dome of fired clay standing in the open on swept ground**, dominant and
  unroofed. Here the fire is an open hearth on a platform inside a colonnade. A dome against a
  hearth, dark fired clay against pale ashlar.
- **Era one's Stone Circle and era three's furnace court do not need separating**, because the hub
  rethemes: only one town hall stands, and it is this one.

---

### 7. The Grain Dock — civic, food *(2×2)*

**Plot 2×2 (8×8u). Cost 640 silver, food for ~160. The era's food building.**

**Silhouette.** A plain rectangular masonry granary standing on **a raised ventilated floor**,
with **a row of loading doors along one long side** under a shallow tiled roof and a paved apron
in front of them. Deliberately plain: this is infrastructure, and the era's character lives in
the Baths.

**How it stands up.** Load-bearing walls on a solid plinth, with the floor carried clear of the
ground on the plinth's own vents so air passes under the grain; a timber floor above; a truss
under the shallow tiled roof. The loading doors are rectangular lintelled openings, not arches.

**Materials.** Ashlar and brick, terracotta tile, a timber floor. **Note the two departures from
the era's four materials** — brick as a visible wall face, and the buttressed side walls the
civic file specifies — both reported under **Defects**. Where the brick shows, keep it under
lime stucco close to the body hue, which is the one way §2 admits brick at all.

**Props.** Sacks stacked on the apron, a hand crane, corded bales, timber sorted and stacked,
cart ruts worn to the apron, chaff drifted against the plinth.

**The detail that has to read: the vents in the plinth.** The building is up off the ground and
the reason is visible — a line of small vents in the solid plinth under the floor line. This is
also what keeps it apart from era two's raised granaries.

**Rank.** Low and wide, below the Custom's House and above the Wine Cellars.

**What it must not resemble.**

- **Era two's Granary (civic, 2×1)** and **era two's Seed House (`EXP.1`, `store`, 2×1)**, both
  raised granaries, and the closest exact-form collision the era-two scan found for this
  building. They separate on **how the building is lifted**: era two's stand on stone stumps with
  a visible open gap and daylight under the floor, a notched ladder at one end, and era two's
  Granary deliberately **reads full**, with baskets under the eaves and grain spilling at the
  threshold. This stands on a **solid vented plinth with no gap to see through**, is reached from a
  paved apron rather than a ladder, and is closed.
- **the Wine Cellars (#4)**, in this era — see the axis there. Rectangular lintelled doors in a
  square-ish box against a long run of semicircular arched mouths.
- **Era three's Treasury (`LIN.4`)**, which is also a closed masonry store. Its openings are one
  lockable door; this has a row of doors and a working apron in front of them, and it is
  demonstrably in daily use.

---

### 8. The Cottages — civic, livability *(1×2)*

**Plot 1×2 (4×8u). Cost 800 silver, 160 livability. The plot was halved from 2×2 on 2026-07-29
so the building could be what it is for.**

**Silhouette.** **A four-storey slab, tall and tight** — shops with wide openings at street
level, dwellings above, small balconies, an external stair climbing one face, and a shallow tiled
roof. Against the Grain Dock's low sprawl beside it this should read narrow and vertical: the
half-width plot is what makes the height do the work.

**How it stands up.** Load-bearing masonry at the ground storey with wide lintelled or arched
shop openings, upper storeys lighter and stuccoed, timber floors between, an external stone stair
carried on the flank, and a shallow trussed tiled roof over. Balconies are timber and shallow,
never deep enough to break the slab's silhouette.

**Materials.** Brick-faced masonry with lime stucco above the ground storey, timber balconies,
terracotta tile. **The civic file's "brick-faced concrete" is a departure from the era's four
materials** — reported under **Defects**; keep the visible faces stucco over brick, which is the
reading §2 permits.

**Props.** Cloth hung at a balcony, jars on a landing, a shop counter under a wide opening, a
worn threshold, chippings and cart ruts in the paving at the foot.

**The detail that has to read: the external stair.** It is how a city houses people without
spreading and it is the honest reason this building is tall. Express it on the outside, climbing
one face, and let it break the flank's rhythm.

**Rank.** **The tallest thing era four draws.** This is the architectural counterpart of the
era's **height premium** — the economy charges 25% more for this building than for the food
building precisely because it goes up where earlier dwellings spread, and the art has to earn
that. It is the first building in the run to go properly vertical for housing.

**What it must not resemble.**

- **Era three's Walled Houses (civic, 2×2)**: mud-brick ranges on three sides of an enclosed
  court with flat roofs used as living space and a single gated entrance. **Court against stack** —
  that one spreads round a hole in the middle, this one has no court at all and goes up.
- **Era two's Village Houses (civic, 2×2)**: four or five flat-roofed mud-brick cells sharing
  party walls, roof terraces reached by ladders, a shared doorway court. Same axis, plus **tiled
  pitched roof against flat mud roof**, and pale against ochre.
- **Era one's Hut Cluster (`NUM.2`, `dwelling`, 2×2)** and **era one's Family Lodge (civic,
  2×2)** need no argument: a four-storey slab against a scatter of domed huts and a single
  low-eaved ridged lodge.
- **Note for the consolidated pass, not a risk today.** The `dwelling` subtitle row authors **the
  Shop Row** for this era and marks it inert, because no node lands on `dwelling` here. If that
  dressing is ever activated, its courtyard block also carries *shops opening onto the street
  front with dwellings above*, and it would collide with this building on exactly that read. §5's
  own history note already names the separator: **the court**. The block wraps a peristyle court
  on all four sides and this has none.

---

### 9. The Baths — civic, happiness *(3×2)*

**Plot 3×2 (12×8u). Cost 800 silver, 160 happiness. The era's centrepiece, and it anchors a
whole quarter.**

**Silhouette.** A big vaulted hall with **a low dome over the hot room beside it**, a **colonnaded
palaestra court along the front**, and a smoking furnace end. This is the era's clearest statement
of what mortar and dressed stone make possible, and it should read as the most important thing on
the island that is not the hub.

**How it stands up.** The frigidarium hall is a masonry vault on heavy piers, lit by **high
clerestory openings** above the springing — **unglazed voids or grilles, because window glass at
any size is absent from this era.** The caldarium's dome sits **directly on its own walls, with no
drum under it and no lantern above it**. The palaestra is a peristyle colonnade along the front,
carrying a tiled lean-to roof round an open court. The furnace end is a low masonry service block
at one flank.

**Materials.** Ashlar, marble accents, terracotta tile, mosaic, and vaulting. **The civic file's
"concrete vaulting" is a departure from the era's four materials** and the dome sits against §2's
absent list — both reported under **Defects**. Marble in niches and on thresholds, mosaic
underfoot and at the entrance.

**Props.** Statuary in niches and on plinths, a public basin with a worn rim and an overflow
channel, an aqueduct spur on low arches arriving at a stone tank, a mosaic threshold panel, worn
paving through the palaestra.

**Emitted light.** The furnace mouth at the service end is an **emissive surface inside the model**
and lights nothing around it. Smoke from that end is geometry, not light.

**The detail that has to read: the dome beside the vault.** The two roof forms side by side —
one long vault, one low dome — are what make this building the era's centrepiece at zoom-out, and
they are also the only clean way to keep it apart from era three's bathing building.

> **The dome is load-bearing for recognition and it sits against the era's own absent list, so
> this brief takes the narrowest reading that satisfies both.** §2 withholds *"the dome on a
> drum, which is the Renaissance's whole announcement"*, and §4 and the authored checklist state
> it more flatly as *"the dome"* and *"no dome and no drum"*. The civic file specifies a **domed
> caldarium**. **Briefed as a low dome springing directly from the hot room's walls, with no drum
> and no lantern** — which keeps §2's letter, since the thing reserved for the Renaissance is the
> dome *raised on a drum*, and it is also what a Classical bath actually was. Reported under
> **Defects** as a tension the consolidated pass should resolve in words.

**Rank.** Second, behind the Cottages.

**What it must not resemble.**

- **Era three's Steam House (civic, 3×2) — the sharpest cumulative collision in the civic set,
  and the closest match in the whole scan.** Same footprint, adjacent eras, and the *same parts*:
  era three's is *"a vaulted mud-brick hall over a stone-lined plunge basin, a smaller hot room
  with a hypocaust under it, a **colonnaded** drying porch along the long side, steam standing
  under the vault and smoke from the furnace end."* Vault, hot room, colonnade, furnace end,
  3×2 — all four elements and the plot. The naming pass caught the *name* collision and renamed
  era three's from *The Bathhouse*; **nothing addresses the form collision.** Three separators,
  in the order they survive zoom-out:
  1. **The dome.** Era three has no dome anywhere — it cannot, its era has no mortar. One low
     dome beside a vault is this building's silhouette and era three's has only the vault.
  2. **Body hue and grain.** Pale flat-faced ashlar with fine level joints against ochre
     mud-brick mass. Era four is the first pale era and this is where that pays.
  3. **Where the colonnade sits and what it encloses.** Era three's is a **drying porch along one
     long side** with statuary nowhere; this is a **full peristyle court across the front** with
     statuary in niches, and the court is open ground you cross.
  **One caution on the material separator.** Era three's civic file lists *"undressed and dressed
  stone"* for the Steam House, which reads as though it had ashlar. It does not: era three's §2
  confines the era to *roughly squared stone, laid dry*, and its own note on the word *dressed*
  rules that *"this table wins for the buildings"*. Draw era three's as squared and dry-laid with
  visibly uneven joints, and this one's ashlar separator holds.
- **the Senate House (#6)**, in this era, on the same 3×2 plot — see the axis there. A fire at
  the back of a roofed mass against a fire in the middle of an open court.
- **Era two's Bread Oven (civic, 2×2)**, the island's other dome over a fire. That dome **is** the
  whole building and stands alone on swept ground in dark fired clay; this dome is one element of
  a large pale complex with a colonnade in front of it.

---

### 10. The Fountain — civic, blend *(1×1)*

**Plot 1×1 (4×4u), the smallest plot in the era. Cost 960 silver, 80 livability + 80 happiness.**
The premium buys a plot: both dials on a single tile.

**Silhouette.** A small paved court with **a fountain basin fed by a visible pipe off an aqueduct
spur**, a low wall round part of it, benches, and **two clipped trees** standing as the only
verticals. At this size the basin alone would read as a trough, so the pipe and the trees are the
silhouette.

**How it stands up.** A basin of coursed ashlar with a marble lip, standing on fitted paving laid
to a camber with a kerb and a gutter; the aqueduct spur arrives on low arches at the plot's edge
and discharges through a lead pipe into the basin; a low ashlar wall on one or two sides; the
water runs continuously and overflows into a channel cut in the paving.

**Materials.** Ashlar, a marble basin, terracotta paving, a lead pipe. The lead pipe is the one
metal here and it is a fitting, never structure.

**Props.** Benches under the trees, a worn rim where vessels rest, a wet patch worn dark in the
paving, a stepping-stone crossing at the kerb, a smaller cut plaque on the low wall.

**The detail that has to read: the water arrives by pipe.** The spur, the pipe and the continuous
overflow are what date this building and what separate it from every other water point on the
island. Water is **delivered** here, not found and not drawn.

**Rank.** Nothing above the trees. The lowest of the civic set.

**What it must not resemble.** **Era one's civic file states this family outright — *Spring →
Village Well → Fountain* — so by era four there are three 1×1 water points standing on the
island and all three have to be told apart.** They separate on **how the water gets there**, and
on the one vertical each has:

| | Era one's Spring | Era two's Village Well | **The Fountain** |
| --- | --- | --- | --- |
| Water | **Found.** Rising in a shallow rock hollow | **Drawn.** Up a lined shaft | **Delivered.** Piped from an aqueduct spur, running continuously |
| The one vertical | A hide awning on three poles | **A timber windlass frame** over a ring parapet | **Two clipped trees** |
| Ground | Earth beaten pale and hard | Swept ground, a wet patch | **Fitted paving to a camber**, kerb and gutter |
| Material | Undressed stone kerb, hide, timber | Undressed stone and timber, **no metal at all** | Ashlar, marble lip, lead pipe |

- **Era three's Trading Post (civic, 1×1)** is the fourth single-tile building and is not water:
  a small stone-footed building under a projecting timber canopy with a great balance beam under
  it. **Canopy and beam against no roof at all** — this building has no roof anywhere on it.

---

## The cumulative confusion set

**Why this is wider than the skill's Step 5 asks for.** Step 5 scopes *what it must not resemble*
to the era being briefed. Under the 2026-07-29 no-re-dress ruling a skill building is drawn once,
keeps that look permanently and is never demolished, so **an era-four city has era one, two and
three physically standing on it**: sixteen buildings before era four lays a block. The confusion
set is everything built so far.

**Scoped by risk, not swept exhaustively.** Era three in full, because it is adjacent and shares
the most structural vocabulary. Eras one and two as a scan for exact form collisions only.

**Sources.** Era three's brief does not exist yet — another worker has it — so era three was read
from its **source documents** at `docs/superpowers/specs/eras/era-03-bronze-age/`
(`style-guide.md` and `civic-buildings.md`). Era two was read from its **written and locked
brief** at `output/imagegen/era-02-neolithic-building-briefs/README.md`. Era one was read from its
own two documents.

**The structural result first, because it changes the risk profile of everything below.** Era four
is **the first pale era**, and §2 says so directly: limestone as the body *"is the era's single
biggest visual break: it is the first time the town is pale, after three eras of earth."* Eras
one, two and three are thatch-and-earth, mud brick and mud-brick mass respectively, all in the
ochre-to-red band. **So body hue alone separates every building drawn here from every building
already standing**, which is what the folder README means when it says an inherited building and
a new node are *"distinguished by era for free."* The residual risks are the cases where a plan or
a silhouette is so close that hue is the only thing doing the work, and those are the ones worth
naming — because hue is not on the sanctioned list of separators (*plan, scale or props, never
geometry*), so anywhere the shapes coincide, a second axis is owed.

### Era three, in full — checked building by building

| Era three building | Mass / role | Plot | Era four rival | Verdict |
| --- | --- | --- | --- | --- |
| the Merchants' Hall (`LIN.1`) | `hall` | 2×2 | **the Custom's House** | **COLLISION.** Two axial halls with an internal row of posts on one plot. Separated by **apse and clerestory** — see brief #3 |
| the Bronze Foundry (`LIN.3`) | `workshop` | 2×2 | **the Stonecutters' Shop** | **COLLISION.** Two open-fronted square workshops with a racked back wall. Separated by **fire** (two hearths, bellows, slag against none) and by the colonnade — see brief #1 |
| the Treasury (`LIN.4`) | `store` | long | **the Wine Cellars** | **SHARPEST COLLISION.** Same mass, same long plot, both bonded, both shut. Separated by **arch against lintel** — one door against a row of arched mouths — see brief #4 |
| the Ingot Yard (`LIN.5`) | `yard` | 2×2 | **the Barracks** | **RESOLVED by the form change.** It was a collision of two open working yards, separated by verticality and plot. `POL.2` is now a roofed range, so the axis is **roof and plot**: open to the sky with nothing above waist height on a square, against a one-storey arcaded range on a long strip — see brief #2 |
| the Stronghold (`LIN.6`) | `tower` | 2×2 | — | **CLEAR.** Era four draws no tower: no era-four node lands on `tower` |
| the Council Hall (hub) | `town-hall` | 3×2 | — | **CLEAR by mechanism.** The hub rethemes, so era three's furnace court does not stand beside era four's Senate House |
| The Terraced Fields | civic food | 1×2 | The Grain Dock | **CLEAR.** Stepped earth terraces with sluices against a masonry granary |
| The Walled Houses | civic livability | 2×2 | The Cottages | **CLEAR on a stated axis.** Court against stack — see brief #8 |
| **The Steam House** | civic happiness | **3×2** | **The Baths** | **SHARPEST COLLISION IN THE SCAN.** Same 3×2, and vault + hot room + colonnade + furnace end in both. Three separators, dome first — see brief #9 |
| The Trading Post | civic blend | 1×1 | The Fountain | **CLEAR.** Canopy and balance beam against an unroofed paved court |

### Eras one and two — exact form collisions only

**Four found, and all four are silhouette-level rather than incidental.**

1. **Raised long stores.** Era two's **Seed House** (`EXP.1`, 2×1) and **The Granary** (civic,
   2×1) are both long stores lifted on stone stumps with **daylight showing under the floor**.
   Era four's **Wine Cellars** (2×1) and **The Grain Dock** both stand on raised bases. Separated
   by **what the gap is**: daylight under stumps against a solid masonry plinth or platform. The
   Grain Dock's plinth vents are its own second tell. Briefs #4 and #7.
2. **Three single-tile water points.** Era one's **Spring**, era two's **Village Well**, era
   four's **Fountain** — a family era one's own civic file names. Separated by **how the water
   arrives** and by the one vertical each carries: found under an awning, drawn under a windlass
   frame, delivered under two clipped trees. Full table in brief #10.
3. **A ring enclosing a communal fire on worn ground.** Era one's **Campfire** (civic, 2×2) is a
   wide ring of undressed stone round a central fire with the earth worn pale; era four's **Senate
   House** is a colonnaded court round a central hearth with worn paving. **Nearly the same plan
   idea.** Separated by **scale and verticality**: knee-high ring with nothing above ~2 units
   against a full colonnade with an entablature, a tiled walk and a portico on a 3×2 plot. Brief
   #6.
4. **Single long ridged halls.** Era one's **Family Lodge** (civic, 2×2) and era two's **Meeting
   House** (`RAD.3`, 2×2) are both one long ridged hall on the square plot, and with era three's
   Merchants' Hall that makes **three** rivals for era four's basilica. All three are
   single-level and see-through or symmetrical end to end. **One discriminator answers all
   three: the apse and the clerestory.** Brief #3.

**Two clean results worth recording as results.** Era one's **Roundhouse** (`hall`, conical) and
**Lookout** (`tower`, open frame) collide with nothing era four draws, because era four draws no
round hall and no tower — the tholos and the harbour tower are both chain dressings the ruling
means will never be built. And era one's **Hide Shed**, **Hut Cluster**, **Tool Shelter** and
**Clearing** each separate from their era-four counterparts on plot, scale or a single silhouette
element with nothing further owed. *(The Clearing's *swept against heaped* against the Stone Yard
used to be the tightest of the four; with `POL.2` re-authored as the **Barracks** the axis is
**unbuilt against built** and it is now the loosest. Brief #2 states it.)*

### Within era four itself

The folder README names **one** pair for era four — `POL.1` / `POL.8` on `workshop` — and that is
correct as a count of mass-sharing pairs. **Three further pairs share a plot rather than a mass,
and none of them is separated anywhere in the era's two documents**, so the axes are stated in
the briefs above:

| Pair | Shared | Axis stated in |
| --- | --- | --- |
| the Stonecutters' Shop / the Surveyor's Shop | mass and plot (2×2) | #1, #5 — open on one side against enclosed |
| the Senate House / The Baths | plot (3×2), and a colonnaded court with a fire | #6, #9 — fire in the middle of an open court against a fire at the back of a roofed mass |
| the Wine Cellars / The Grain Dock | both cargo buildings with openings along one side | #4, #7 — arch against door, long against square |
| the Custom's House / the Surveyor's Shop | plot (2×2), both closed ashlar volumes | #3, #5 — stepped section and apse against one unstepped volume |

**Four of era four's ten buildings sit on the 2×2 plot** — the Stonecutters' Shop, the Surveyor's
Shop, the Custom's House and The Grain Dock — which is the densest single-plot cohort in the era
and the reason the last two rows above are worth having.

---

## Defects found in the source documents, reported and NOT fixed

**None of these was corrected.** A consolidated documentation pass is coming, another worker is
in era two's folder, and this brief's own two renames are being batched into that pass. Verified
at `3095767`.

### 1. Stale counts survive in four live places, and the corrected figure appears once

The roster section states the correction plainly — *"**Twenty-one buildings stand by the end of
it**, not twenty-three"* — and the folder README's era-four row confirms it folder-wide
(*"Cumulative dressings 23 → 21"*). The header reads **New nodes: 5** and **Buildings standing by
the end of this era: 21**. But **"twenty-three" survives at lines 52, 86, 179 and 613**, none of
them under a banner:

- **Line 50-52, "Notes before authoring":** *"**Seven new nodes** is the third-largest intake …
  twenty-three buildings standing."* Both figures are stale; the era has five nodes.
- **Line 86, §1:** *"what makes twenty-three buildings on one small island read as a city."*
- **Line 179, §4:** *"it can be repeated twenty-three times without becoming noise."*
- **Line 613, §6:** *"All twenty-three buildings get three models each."*

Line 613 is the one with a practical consequence, because it is a statement about how many models
are owed.

### 2. The `store` subtitle's rationale contradicts §5 on the one axis that separates the pair

§5: `POL.4`'s warehouse *"is the opposite of it — a row of barrel-vault mouths closing onto a
raised loading platform, goods going straight from cart to bay with **nothing visible from the
street** — so the pair reads see-through against shut."*

The subtitle row's bullet: *"`POL.4` … **keeps the chain's contents on show in the open bays**."*

These cannot both be true, and the choice decides whether the building is drawn open or shut.
**This is the same defect class the folder README records for four other subtitles** — *"Four
subtitles were naming a DIFFERENT BUILDING from their own roster … era four's `yard` said Paved
Court over a stone yard with a hoist"* — surviving here as a *rationale* attributing the sibling's
defining property to `POL.4` rather than as a wrong name. Briefed shut, per §5.

### 3. The workshop open-floor rule and §5 disagree about whether `POL.8` is enclosed

§5: `POL.8`'s workshop *"is the third — enclosed, long benches down its length, rules and rods in
racks — and is **the only one of the three whose floor you cannot see from outside**."*

The closure block: *"**the workshop mass keeps at least one side open to the air in every era that
can manage it** … In this era that means a colonnaded front with **the bench work visible from
outside**, and no cella behind it."*

The rule's subject wobbles between *the portico* (the chain instance, in the item's heading and
its *"for the whole chain to inherit"*) and *the workshop mass* (which includes `POL.8`), and
*bench work* is `POL.8`'s own distinguishing prop. Briefed enclosed, per §5, because an
open-fronted `POL.8` collapses into `POL.1` and destroys the one pair separation the folder README
asks era four for.

### 4. The footprint closure block understates §5 on how `POL.1` and `POL.8` separate

The closure block: *"POL.1 and POL.8 share both mass and plot, so they separate on **props
alone** (blocks and chisels against rules and rods), **which §5 already commits to**."* §5 in fact
separates them on **openness** as well — `POL.1` open on one side, `POL.8` enclosed — which is the
stronger axis and the one that survives zoom-out. An artist following the closure block alone
would drop the better separator. Briefed with openness primary and props secondary.

**Not a defect, and worth recording as a clean result:** every node id in that block carries the
correct mass — POL.1 and POL.8 on `workshop`, POL.2 on `yard`, POL.3 on `hall`, POL.4 on `store`,
all five matching both the roster table and `ERA_SEQUENCE`. **Era two's crossed-id defect does not
recur here.**

### 5. `civic-buildings.md` specifies four things `style-guide.md` §2 rules out or does not carry

| Where | What it specifies | Against |
| --- | --- | --- |
| The Grain Dock | **"buttressed side walls"** | §2's absent list: *"the pointed arch and **the buttress**, which the Medieval era owns"*; §3: *"Nothing that needs a buttress, because the buttress is Medieval"*; and the Lesson framings rule restates *"no buttress"*. **The flattest contradiction of the five** |
| The Baths | **"a domed caldarium"** | §2 absents *"the dome on a drum"*; §4 absents *"the dome"* flatly; the authored checklist says *"no dome and no drum"*. §2's is the qualified formulation, so a dome with no drum keeps its letter — see brief #9 |
| The Baths | **"high clerestory windows"** | §2: *"window glass at any size … so every opening here is a shutter, a grille or a void"*. Loose wording rather than a certain contradiction — `POL.3`'s own clerestory shows the form is legal, so read *windows* as unglazed openings |
| The Grain Dock, The Cottages, The Baths | **brick as a visible face; concrete** | §2's four materials carry neither. §2 admits brick only as *"a skin over rubble or **brick** where ashlar is not affordable"* — a substrate under stucco, not a face. Concrete appears nowhere in §2, and Roman concrete being period-honest is not the same as its being one of the era's four |

### 6. `civic-buildings.md` gives world-unit heights where `style-guide.md` refuses to

§3: *"Heights are stated as an order, and **this guide deliberately gives no world-unit
targets**."* The civic file gives ~8, ~14, ~13 and ~5 units. **Used here only as the relative
order the civic file states**, never as a target. This is the same contradiction era two's brief
flagged and left open for its own pair of files, so it looks like a folder-wide convention split
between the two file types rather than an era-four slip.

### 7. The subtitle row flags `dwelling` as inert but not `tower`, and both are

No era-four node lands on `dwelling` — the row says so: *"Inert: no node on `dwelling` here."*
**No era-four node lands on `tower` either**, and the row authors *the Lighthouse* for it under
**Kept** without the same note. Both dressings have nothing to attach to in this era, since the
inherited tower keeps era one's look and its own name. Minor, and possibly deliberate given the
Lighthouse was carried over rather than newly authored, but the asymmetry will read as an
oversight to the next person transcribing the row.

### 8. §2's release sentence names three of the four things earlier eras withheld for this era

§2: *"the largest release in the run: **lime mortar, the true arch and dressed ashlar**."*
Verified against the earlier guides at the tip: era two's absent list reads *"lime mortar and the
true arch, which the Classical era owns; **dressed ashlar**, Classical again; **fired roof tile**,
also Classical"*, and era three's reads *"lime mortar and the true arch, both Classical; **fired
roof tile**, Classical; coursed ashlar, Classical again."* **So the fired roof tile is a fourth
release, saved for this era by both guides**, and terracotta tile is one of era four's own four
materials. The theme brief above carries all four. Not wrong so much as incomplete, and it
understates the era's own arrival.

### 9. §5's pair separations are drawn against buildings the ruling means will never be built

Not a contradiction, but the most consequential thing about reading §5 today, so it is recorded.
§5 separates each roster node from *"the chain's"* Classical dressing — the tholos, the market
colonnade, the portico, the paved court — and under the head banner's REFERENCE ONLY marking
**none of those four is ever drawn**. So *"Two stores stand in this era and the colonnade carries
the chain"* describes a pair in which only one member exists. The instructions §5 derives are
still worth having, because *read shut* and *keep three sides open* are real design decisions —
but **the buildings actually standing on those masses are era one's, era two's and era three's**,
which is why the confusion sets above were re-derived against the standing city rather than
copied from §5.

---

## Verified, so it is not re-checked

- **Node ids.** `ERA_SEQUENCE`'s `classical` entry is
  `["POL.1", "POL.2", "POL.3", "POL.4", "POL.8"]` — an exact match with the roster table, and with
  the roster's own account of why `POL.5`, `POL.6` and `POL.7` are elsewhere.
- **Material id.** `silver`. `silver_coin` survives only in era four's rename banner and in the
  before/after table at `2026-07-29-era-resource-model-design.md` §4.1a, both of which are
  historical records of the old id rather than uses of it.
- **The height premium has an architectural counterpart, and it is housing.** The economy's 25%
  premium on the Cottages is matched on the skill side by the dwelling mass making *"the largest
  single jump any mass makes in this era"* — §3 calls the dwelling's climb *"the interesting
  movement"* and §5 has it leaving the low half of the city for the tall half. **But that
  counterpart is REFERENCE ONLY**: no era-four node lands on `dwelling`, so the courtyard block is
  never drawn. **The only place the premium is visible in era four's art is The Cottages**, which
  is why brief #8 makes the external stair and the tight vertical slab load-bearing.
- **Banners read before the text under them.** The head banner (re-dressing), §5's REFERENCE ONLY
  banner, §5's CORRECTED banner on the node counts, the CLOSED banner on the era-one hall
  prediction, the two HISTORY blocks for `POL.6`'s townhouse and `POL.7`'s odeon, the REWRITTEN
  banner on the subtitle row, and the civic file's two RENAMED-TWICE banners and its KEPT banner
  on The Baths. **Nothing from a withdrawn, superseded or history block is briefed as live** —
  `POL.6`'s townhouse and `POL.7`'s odeon in particular are Early Modern nodes and are not here.
- **Sections found by heading text, never by number**, as the skill requires. Era four numbers its
  materials §2, structure §3 and ornament §4, and pulls the palette out of the numbered sequence
  entirely; era one's ornament is §5 and its palette §4.

---

## Related

- `docs/superpowers/specs/eras/era-04-classical/style-guide.md` — the era's materials, structural
  language, ornament, the masses, the roster, the construction stages, the props kit, the subtitle
  row and the advisor.
- `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md` — the four bought types, their
  footprints, costs and capacities, and the `silver` resource.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0 — the nine hard constraints
  every era inherits; §6 for the frozen footprint table, which is the only copy.
- `docs/superpowers/specs/eras/era-03-bronze-age/` — read in full for the cumulative confusion
  set, in place of era three's brief, which does not exist yet.
- `output/imagegen/era-02-neolithic-building-briefs/README.md` — era two's written and locked
  brief, used directly for the era-two half of the scan.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produced this document.

---

# Compressed, for prompting

**How to use this section.** Prepend **The theme brief** and **Constraints that bind every image
below**, then paste one entry. Each entry stands alone once those two are in front of it: it
carries the silhouette, the load path, only the materials that differ from the era default, the
one detail that has to read, and the single confusion to avoid. Height rankings and prop lists are
deliberately not here — they are in the full briefs above.

**the Stonecutters' Shop — skill, `POL.1` on `workshop`, 2×2 (8×8u).** A low ashlar block under a
shallow pitched tiled roof with a colonnade running the whole of one face, and the mason's work
spilling out past the columns onto the paving. The colonnade is real structure: stone shafts on
bases carry an entablature, the roof truss bears on that at the front and on the ashlar back wall
behind, and the enclosed working room fills the rear two-thirds of the plot. One marble drum sits
among the limestone shafts where a block has been reused. **The detail that has to read is that
the work crosses the colonnade** — blocks on trestles, chisels and chippings must spill past the
columns onto the ground beyond, so this is a working floor with a roof over it and not a small
temple. **It must not resemble era three's Bronze Foundry**, the island's other open-fronted
square workshop with a racked back wall: that one has two smelting hearths, bellows and a spoil of
slag, and **this building has no fire on it anywhere.**

**the Barracks — skill, `POL.2` on `yard`, 2×1 (8×4u).** *(Re-authored from the Stone Yard — a FORM
change, era four's entry in the defence lineage. Brief #2 has it in full.)* A low single-storey range
of soldiers' cells running the whole length of the long plot, one room deep, under one low-pitched
tiled roof with a straight unbroken ridge, with **an arcade of semicircular arches carried the full
length of the front** shading a line of plain square-headed doors. Dressed ashlar to the veranda and
lime-plastered rubble behind it; the arcade is structure rather than ornament and is nearly the whole
of the ornament there is, plus a plain string course and a cut inscription panel over the end door.
At one end, **a drill ground of compacted earth — deliberately not paved — held by a low ashlar wall
with a single gate**. Arms racked in the shade: spear shafts upright in a timber rack, shields hung
flat on the back wall, a water trough cut from one block at the gate. **No tower, no parapet, no
crenellation and no gate arch**, and nothing aimed, in use or on fire — the building is a garrison's
quarters standing empty. **The detail that has to read is one row of cells and never two**: no second
storey and no wing returning at right angles, because `POL.2` hosts factoring and a rectangle of
identical bays is an area model where a single line of them is a count along a length. **It must not
resemble era three's Ingot Yard**, the other yard-mass building still standing, which is open to the
sky with nothing above waist height on a square plot; nor `POL.4`'s bonded warehouse, the era's other
long arched range, whose arches are **barrel-vault mouths you drive a cart into on a raised
platform** where these are a shading arcade in front of a wall of doors at ground level.

**the Custom's House — skill, `POL.3` on `hall`, 2×2 (8×8u).** A tiled pitched roof over a raised central hall with lower aisle roofs flanking
it on both sides, a pediment closing the entrance end and a half-round apse pushing out of the
far end, so the axis is made by section and termination rather than by a long thin plan. Two rows
of internal columns carry the central hall's walls, the aisles lean against them under their own
lower roofs, and the clerestory — a row of openings in the raised centre wall above the aisle
roofs — carries the central truss above it; every opening including the clerestory is an unglazed
void or grille. Marble appears as a threshold and as the cut inscription panel over the entrance,
which is where a harbour's business room states its authority. **The detail that has to read is
the clerestory band**, the gap between the aisle roofs and the raised centre wall punched with
openings, which at zoom-out is a pale stripe above a lower roof. **It must not resemble the three
earlier long ridged halls still standing** — era three's Merchants' Hall, era two's Meeting House
and era one's Family Lodge — all of which are single-level and see-through or symmetrical end to
end: **the apse and the clerestory are the one discriminator that answers all three.**

**the Wine Cellars — skill, `POL.4` on `store`, 2×1 (8×4u).** A long low ashlar range under a
shallow tiled roof, its whole length a row of semicircular barrel-vault mouths standing on a
raised loading platform, with the arch rhythm as the dominant shape and the platform edge as a
hard horizontal accent beneath it. Each bay is a true barrel vault of voussoirs springing from
piers between the mouths, so the arch carries the wall over every opening and the vaults take the
roof above; the platform is solid coursed masonry with a moulded coping at cart-bed height. Lime
plaster lines the bay soffits where ashlar is not worth spending, and a moulded string course runs
at the arches' springing line. **The detail that has to read is that the bays are shut** — goods go
straight from cart to bay with nothing visible from the street, so close the mouths with shutters,
a grille or simple darkness and let the platform and the rhythm carry the building; and because
this node hosts completing the square, the bays are counted along a length, never a four-sided
arrangement and never with one odd bay set apart to finish it. **It must not resemble era three's
Treasury**, which shares this mass, this plot and this shut read: that one is a single lockable
door in a thick ochre mud-brick wall, and **this one is many semicircular arches in pale ashlar.**

**the Surveyor's Shop — skill, `POL.8` on `workshop`, 2×2 (8×8u).** *(Merged. The files read* the
Measuring Shop *and the roster read* a measuring and dividing workshop *until the consolidated pass;
both now read* surveyor's shop.*)* A single
low enclosed ashlar box under a shallow pitched tiled roof, with a rhythm of engaged shafts laid
across its faces and a cut inscription panel over the door, reading as a plain block with a
rhythm on it. Load-bearing ashlar walls carry a timber truss directly, and the bays are expressed
on the wall as engaged shafts rather than standing free, which is how this era makes a closed
building agree with its colonnaded neighbours without becoming one; openings are small lintelled
voids and grilles set high. Lime stucco covers the upper part of one flank, and the marble
inscription panel over the door is the building's one piece of marble and its most important
surface, cut letters with the shadow inside the cut doing the work and no pigment. **The detail
that has to read is that the rules and rods are tools in a rack and never a graduated scale
running the length of a wall**, since this node hosts long division. **It must not resemble the
Stonecutters' Shop**, its mass-mate on the same plot: **that one is open on one side with its floor
and bench work visible from the street, and this is the one building of the pair whose floor you
cannot see from outside.**

**the Senate House — hub, `town-hall`, 3×2 (12×8u).** A colonnaded court in ashlar and tile
enclosing a raised stone hearth at its centre, open to the sky over the middle, with a portico
across the entrance and worn paving where people stand — wide rather than tall, and the one
building in the city that rethemes. A peristyle turns the colonnade inward on all four sides and
carries a tiled lean-to roof over the walk while the centre stays open; the portico takes the same
order with a pediment and one more bay of depth, worked so there is no blank rear anywhere,
because the camera orbits. Marble appears at the hearth platform's coping and threshold, the one
place this era spends it on the hub. **The fire is never let out and it is an emissive surface
inside the three-tone model** — bright in itself, lighting nothing, with no warm pool on the paving
and no glow on the nearest column — and **the detail that has to read is that the centre is open
and the fire is in it**: the roof covers the walk and never the middle, and the hearth must be
legible from outside across the court. **It must not resemble era one's Campfire**, still standing
and nearly the same plan idea — a wide ring of undressed stone round a central fire on worn pale
earth — which is knee-high with nothing above about two units, where this has a full colonnade, an
entablature, a tiled walk and a portico.

**The Grain Dock — civic, food, 2×2 (8×8u).** A plain rectangular masonry granary standing on a
raised ventilated floor, with a row of loading doors along one long side under a shallow tiled roof
and a paved apron in front of them; deliberately plain, because this is infrastructure and the
era's character lives in the Baths. Load-bearing walls stand on a solid plinth whose own vents
carry the floor clear of the ground, a timber floor sits above, and a truss carries the shallow
tiled roof; the loading doors are rectangular lintelled openings and **not arches**. Brick sits in
the walls behind lime stucco close to the body hue, which is the only way this era admits it as a
face. **The detail that has to read is the line of small vents in the solid plinth under the floor
line** — the building is up off the ground and the reason is visible. **It must not resemble era
two's Granary or Seed House**, both long stores lifted on stone stumps with **clear daylight
showing under the floor**: this stands on a solid vented plinth with no gap to see through, and is
reached from a paved apron rather than a ladder.

**The Cottages — civic, livability, 1×2 (4×8u).** A four-storey slab, tall and tight on a
half-width plot, with wide shop openings at street level, dwellings above, small balconies, an
external stair climbing one face and a shallow tiled roof — narrow and vertical against the Grain
Dock's low sprawl beside it. Load-bearing masonry carries the ground storey with its wide
openings, the upper storeys are lighter and stuccoed on timber floors, an external stone stair is
carried on the flank, and a shallow trussed tiled roof covers it; balconies stay timber and
shallow so they never break the slab's silhouette. The visible faces are lime stucco over brick,
and the height is doing all the work that the plot no longer does. **The detail that has to read
is the external stair** — it is how a city houses people without spreading, and it is the honest
reason the building is tall, so express it on the outside and let it break the flank's rhythm.
**It must not resemble era three's Walled Houses**, which spread round an enclosed court with flat
roofs used as living space: **court against stack**, and this building has no court at all.

**The Baths — civic, happiness, 3×2 (12×8u).** A big vaulted hall with a low dome over the hot
room beside it, a colonnaded palaestra court along the front and a smoking furnace end at one
flank — the era's centrepiece and the most important thing on the island that is not the hub. The
frigidarium hall is a masonry vault on heavy piers with high clerestory openings above the
springing, **unglazed voids or grilles because window glass at any size is absent from this era**;
**the caldarium's dome springs directly from its own walls, with no drum under it and no lantern
above it**; the palaestra is a peristyle carrying a tiled lean-to roof round an open court. Marble
fills the niches and thresholds and mosaic runs underfoot, and the furnace mouth is an emissive
surface lighting nothing while its smoke is geometry rather than light. **The detail that has to
read is the two roof forms side by side** — one long vault, one low dome — which is what makes this
the era's centrepiece at zoom-out. **It must not resemble era three's Steam House**, which shares
this 3×2 plot and has a vault, a hot room, a colonnade and a furnace end of its own: era three
**has no dome and cannot have one**, so the dome beside the vault is this building's silhouette,
backed by pale flat-jointed ashlar against ochre mud-brick mass.

**The Fountain — civic, blend, 1×1 (4×4u).** A small paved court with a fountain basin fed by a
visible pipe off an aqueduct spur, a low wall round part of it, benches, and two clipped trees
standing as the only verticals — at this size the basin alone would read as a trough, so the pipe
and the trees are the silhouette. A basin of coursed ashlar with a marble lip stands on fitted
paving laid to a camber with a kerb and gutter; the spur arrives on low arches at the plot's edge
and discharges through a lead pipe, and the water runs continuously and overflows into a channel
cut in the paving. The marble lip and the lead pipe are the only departures from the era default,
and the pipe is a fitting and never structure. **The detail that has to read is that the water
arrives by pipe** — the spur, the pipe and the continuous overflow are what date this building.
**It must not resemble era one's Spring or era two's Village Well**, the island's two other
single-tile water points: that water is **found** in a rock hollow under a hide awning and
**drawn** up a shaft under a timber windlass frame, where **this water is delivered**, and the
windlass frame in particular is the shape to stay clear of.

---

# The generated set — 2026-08-01

**Prompts: `era04-classical-concepts.jsonl`, ten jobs, in this folder and committed.** Images are
written in place beside it and are **not tracked**, which is the convention `git ls-files
output/imagegen/` shows. Run with the Codex imagegen CLI, `gpt-image-2`, 1024×1024, quality
`high`, `use_case: stylized-concept`, concurrency 3; every job succeeded on the first attempt and
**nothing was regenerated**.

Each prompt is one paragraph carrying the theme brief, the constraints and one entry from
*Compressed, for prompting*, in the shape era three's `era03-bronze-age-concepts.jsonl` proved.
**The one deliberate departure from era three: every prohibition names the legal alternative in
the same breath**, because era three banned the arch without saying what a hearth mouth should be
instead and got three arched fire mouths back. So *no glass* is written as *every opening is an
unglazed void, a timber shutter or a stone grille*; *no iron* as *fittings are timber or bronze,
and a gutter discharges through a carved stone spout into an open channel*; *no chimney* as *a
plume rising straight off the low furnace block itself*; *no buttress* as *the wall thickens into
plain piers instead*. All four came back drawn as named.

| # | Image | Verdict |
| --- | --- | --- |
| 1 | `pol-1-stonecutters-shop.png` | Pass. Colonnade on one face, work spilling past the columns, no fire anywhere, one paler marble drum among the shafts |
| 2 | `pol-2-barracks.png` | Pass. One row of cells behind a full-length arcade, unpaved drill ground, no platform. Marginal only in that it is the closest silhouette in the set to #4 |
| 3 | `pol-3-customs-house.png` | Pass, the strongest of the ten. The clerestory band reads as a pale stripe above the aisle roofs; apse and pedimented truss both present |
| 4 | `pol-4-wine-cellars.png` | Pass. Bays shut behind timber leaves, counted along one length only, on a coped platform at cart-bed height |
| 5 | `pol-8-surveyors-shop.png` | Pass. Enclosed, engaged shafts rather than a colonnade, rods as tools in a rack. Marginal: the panel over the door came back as an incised setting-out figure rather than cut letters |
| 6 | `townhall-classical-senate-house.png` | Pass. Centre open, hearth legible across the court, fire emissive with no spill onto paving or columns. Marginal: pediment finials and a meander band on the hearth block are §4 leave-out ornament |
| 7 | `civic-grain-dock.png` | Pass. Lintelled loading doors and **no arch anywhere**, vents in a solid plinth with no daylight under the floor |
| 8 | `civic-cottages.png` | Pass. Four storeys, external stair expressed on the flank, no court. Marginal: the plan reads nearer square than the 1×2 strip |
| 9 | `civic-baths.png` | Pass. Vault and low dome side by side, the dome springing off its own wall heads with no drum and no lantern; smoke leaves by a flush flue mouth, not a stack |
| 10 | `civic-fountain.png` | Pass. Spur on semicircular arches, pipe discharging, continuous overflow, no windlass. Marginal: the pipe is not visibly connected to the spur |

**The era-two comparison, which was the point of the pilot.** Era four's ten were put beside era
two's delivered art and measured. **In the delivered art the hue gap is 0.4°, not 4.8°** — the
palette ladder's 4.8° is between two ratified swatches, and the art does not hold it. What
separates the two eras is **chroma**: era four's bodies mean C\* 17.1 against era two's 29.4, ΔE76
**12.31** between the two delivered means, against the ladder's in-situ floor of 6.72. They read
as different eras comfortably, but **not for the reason the ladder records**, and hue is doing
none of the work.

**Read the palette status honestly:** era four's section is headed **PROPOSED — D-ERA27**, so this
art is drawn to a proposed body hue and not a ratified one.

**One tension noticed while prompting, reported and not fixed.** The island section (D-ERA26)
wants the paving laid to a module in a regular bond, *"the eye should be able to follow one joint
line across the whole square"*; the constraint list above wants slabs *"of varied and unequal
size in courses that break and restart … never a regular array"* for the anti-rebus reason. The
two cannot both be drawn. These prompts follow the constraint list, so every paved surface in the
set is irregular.
