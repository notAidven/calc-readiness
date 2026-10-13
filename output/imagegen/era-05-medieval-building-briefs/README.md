# Era 05 — Medieval building briefs

Image-generation briefs for the ten buildings era five owes: **five skill buildings**, **the hub**,
and **four civic buildings**. Written with the `era-building-briefs` project skill, from the era's
own two documents and from nothing else except the constraints every era inherits:

- `docs/superpowers/specs/eras/era-05-medieval/style-guide.md`
- `docs/superpowers/specs/eras/era-05-medieval/civic-buildings.md`
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0, for the nine hard constraints

Read at **`2814951`**, the `origin/integration` tip. Every name below is read from the files at run
time, with one exception the lead has changed and which is flagged in place.

> **The tip moved twice while this was being written, and everything here was re-read against it
> rather than carried over.** The run began at `3095767`; `#255` (the domains-to-eras node
> migration) and `#256` (era two's tower lock and its hub ruling) merged during it. **Nothing in
> era five moved**: `era-05-medieval/style-guide.md` and `civic-buildings.md` are byte-identical
> across the two tips, `ERA_SEQUENCE`'s `medieval` entry survived the migration unchanged, and all
> three occurrences of *the Gabled Row* are where they were. **What did move is era two**, and the
> two paragraphs in this document that depend on era two's merge state are written against
> `2814951`.

**Era five's own five nodes are the whole of the skill deliverable.** Since the 2026-07-29
re-dressing ruling a skill building is drawn once and keeps that look permanently, so the twenty-one
buildings standing from eras one to four are not re-dressed and are not briefed here. The masses
this era *inherits* are marked REFERENCE ONLY in its own guide; they are read below for shape
language and for what era five must not resemble, never as a list of things to draw.

**Era five draws no `yard`.** Its roster puts no node on that mass, which its own subtitle row
states (*"Inert: no node on `yard` here"*). The only open ground era five adds is the civic
Fairground.

---

## Names, and the one rename in flight

| Building | Class | Node / role | Name used below | What the files say at `2814951` |
| --- | --- | --- | --- | --- |
| Weaver's Shop | skill | RAT.1, `workshop` | the Weaver's Shop | the Weaver's Shop |
| Wool Store | skill | RAT.2, `store` | the Wool Store | the Wool Store |
| Guild Hall | skill | RAT.3, `hall` | the Guild Hall | the Guild Hall |
| Tower House | skill | RAT.4, `tower` | the Tower House | the Tower House |
| **Timber Houses** | skill | RAT.6, `dwelling` | **the Timber Houses** | **the Gabled Row** *(now merged)* |
| Court House | hub | `town-hall` | the Court House | the Court House |
| The Great Barn | civic | food | The Great Barn | The Great Barn |
| The Castle | civic | livability | The Castle | The Castle |
| The Fairground | civic | happiness | The Fairground | The Fairground |
| The Chapel | civic | blend | The Chapel | The Chapel |

### ✅ MERGED in the consolidated rename pass: "the Gabled Row" → "the Timber Houses"

**The brief below uses *the Timber Houses*, and so do the files now.** The rename is the team
lead's and the consolidated pass applied it to every document, so an artist reading the era folder
finds **the Timber Houses** and needs no mapping to read this brief.

**Where the old string lived, checked at `2814951` before the pass moved it.** It was a **dressing
name** and appeared in exactly three places, none of them a roster line:

1. `era-05-medieval/style-guide.md:592` — the subtitle row: `` | `dwelling` | Dwellings | **the Gabled Row** | ``
2. `era-05-medieval/style-guide.md:638` — the rationale bullet under that row's REWRITTEN banner
3. `eras/README.md:650` — the cross-era `dwelling` column, era-five cell: `**Gabled Row**`

**The roster line carries no proper noun at all.** `RAT.6`'s row reads *"A jettied row: three narrow
houses, each storey oversailing the one below, steep tiled gables to the street"*, and §5 calls the
`dwelling` chain instance *"the jettied row round a back yard"* in running prose. So the rename
touches the dressing name and nothing else, and no roster row needs editing for it.

**Two things the consolidated pass should see before it applies this, both reported rather than
ruled.**

- **The new name is the one "the Gabled Row" replaced, and the file records why it was rejected.**
  The 2026-07-29 bullet reads: *"**the Gabled Row** for the Timber Houses. *Timber* is a material,
  and this era's whole signature is the frame on the outside of the wall, so naming one building for
  it claims the era's shared property."* That objection is era-internal and still stands on its own
  terms: every building in era five wears an oak frame, so *timber* does not distinguish this one
  from its six siblings. It is the lead's call, and the record of the reversal belongs beside it.
- **It would give era five three *House* names, which no era in the run holds.** Era five already
  has *the Tower House* and *the Court House*; the file's own judged list of nine `-House` names
  gains a tenth, and its note that *"the two same-era pairs worth naming"* are era four's and era
  two's becomes a triple here. The **uniqueness gate still passes**: *Timber Houses* has no exact
  match among the 121 names, and by the folder's own *"the test is on the qualifier, not the noun"*
  rule, *timber*, *tower* and *court* are three unmistakably different things. It joins the four
  `-Houses` names — era two's civic Village Houses, era three's civic Walled Houses, era six's
  Merchant Houses, era seven's Workers' Houses — and collides with none. *(Completed 2026-07-29:
  era six's entry in that list is its **civic** housing only, and the era holds a skill dwelling
  too — **`POL.6`**, which the files carried as *the Printers' Terrace* at this tip and which is now
  **the Printing House**. Its own
  brief carried that rename before it merged, and it is now merged; the rename is
  deliberately not applied here. Neither form is a `-Houses` name, so the gate's result does not
  move; the point is that this list compares era five's housing name against the era after as well
  as the era before, and naming only era six's civic half read as though the run's dwellings jumped
  from era five to era seven.)*

---

## Two things verified rather than assumed, because both have moved recently

### The era's material id is `gold`, not `guild_marks` and not `coins`

**The guides are stale, the code is current, and the divergence is deliberate and guarded.**

- `packages/economy/src/materials.ts` — `medieval: renamed("gold", "coins")`, with the reason in
  place: *"It was unavailable while a currency held the word, so this era ran on `coins` … The
  gold-drop retired that currency, so `gold` is free and era five takes it."*
- `packages/economy/src/civicCatalogue.ts` — all four era-five rows are priced in `"gold"`.
- `packages/economy/src/materials.test.ts` — `expect(nameOf("medieval")).toBe("gold")`.

**So the live question about `gold` is closed and closed in the affirmative.** It was blocked while
a legacy gold currency held the word on the same ledger; D-ERA13's gold-drop retired that currency;
era five took the word. `guild_marks` was the pre-rename id and is two steps behind.

**`era-05-medieval/civic-buildings.md` §1 still says `coins`** and still says *"The lead offered
`gold` and it is UNAVAILABLE"*. That is a known lag rather than drift: `test/eraCivicCatalogueParity.test.ts`
carries era five as the single named entry in its `DOC_MATERIAL_LAG` list — `documented: "coins"`,
`shipped: "gold"` — asserted in both directions, with the reason recorded as *"#244 HOLDs era five's
`coins` on instruction; the gold-drop has already taken the id"*. **Nothing to fix here and nothing
for an artist to do:** no price moved, and the four costs are 1,280 / 1,440 / 1,600 / 1,920 under
either word.

### The node set is five, and the guide agrees with the code

`ERA_SEQUENCE` in `packages/skill-graph/src/eras.ts` gives `medieval` exactly
`["RAT.1", "RAT.2", "RAT.3", "RAT.4", "RAT.6"]` — **five nodes**, with `RAT.5` in `renaissance`
alongside `POL.6` and `POL.7`. The guide's header (*"New nodes: 5"*), its roster table, its head
banner (*"on five masses (`workshop`, `store`, `hall`, `tower`, `dwelling`)"*) and `eras/README.md`'s
table (**5** new, **26** standing) all agree. **No disagreement to report on the roster itself.**

The 26 checks arithmetically against the rosters rather than being taken on trust: era one's six
plus five each from eras two, three, four and five is 26 nodes standing when era five closes.

---

## Defects found, reported and NOT fixed

The consolidated documentation pass owns all of these. Two checks came back clean and are recorded
as such, because a clean result on a known trap is worth as much as a hit.

**✅ CLEAN — no node is crossed against its mass.** Era two's footprint closure block had three of
five crossed. Era five's reads *"RAT.2 (store) and RAT.6 (dwelling) take the long plot; RAT.1
(workshop), RAT.3 (hall) and RAT.4 (tower) take the square full plot"*, and all five pairings match
the roster table exactly. Checked because the trap class is live in this folder, not because
anything pointed at it.

**✅ CLEAN — the node set matches `ERA_SEQUENCE`.** Above.

**1. Three roster one-liners still carry the chain's words that §5 corrected in place.** This is the
same trap class as era three's `store` subtitle naming its sibling, one level deeper. §5 states that
*"Four of the six did not [say which instance carries the chain], and all four described the roster
building in the chain's own words; they are corrected in place"* — but only `RAT.4`'s roster row was
updated to match. `RAT.1`, `RAT.2` and `RAT.6` still read as the chain instance:

| Node | Roster table says | §5 says the roster building actually is |
| --- | --- | --- |
| `RAT.1` | *"A guild workshop, half-timbered over a stone undercroft, shutters folding down into counters"* — which §5 says it *"carried word for word"* from the chain | *"the guild's own hall-workshop — bigger on every axis, a first-floor meeting room over the working floor with a hoist door in the gable, a painted trade sign on a wrought bracket at the corner, and **no tally board**"* |
| `RAT.2` | *"A tithe store: tall stone-gabled barn, opposed cart doors, threshing bay between them"* | *"the **parish** one — shorter by a bay or two, its cart doors **shut and barred** … with a tallyman's porch built against one gable"* |
| `RAT.6` | *"A jettied row: three narrow houses, each storey oversailing the one below, steep tiled gables to the street"* | *"a **wall row** — houses built up against the inside of the town wall with their backs to it, so there is no ground behind them at all, entered from the street through a single covered passage, and longer than three houses"* |

**2. `RAT.2`'s doors contradict themselves inside one file, and this one has to be resolved before
the building can be drawn.** §5 bars them shut; the subtitle row's own rationale for the name
*Wool Store* opens them: *"`RAT.2`'s tall stone-gabled building with opposed cart doors is exactly a
wool store, and **fleeces stacked in the open doorway** keep the chain's *contents on show*."* A
door cannot be both. Briefed below on §5's shut-and-barred reading, with the consequence of the
other reading stated at the building.

**3. `RAT.6` is authored as two different buildings**, per the table above. Briefed below on the
roster's three-narrow-house row, with grounds given at the building.

**4. §5 still counts six new nodes over six masses.** *"The six new nodes above take the same
masses"*; *"**All six ordinary masses carry two dressings in this era** — six new nodes over six
masses, one node each per D-ERA7"*; *"Four of the six did not."* The roster is five nodes over five
masses and `yard` carries none.

**5. §5 still calls `RAT.5`'s mill yard *"the second yard in this era"*** and separates it from the
kitchen garden at length. `RAT.5` moved to Early Modern in #210 and this guide's own roster says
so two sections earlier. §5's REFERENCE ONLY banner covers re-dressing, not roster membership, so
this is a live claim rather than preserved history.

**6. Three stale building counts.** The header and the roster say **26**; *"Notes before
authoring"* says *"thirty buildings dressed"*; §6 says *"All twenty-nine buildings get three models
each"*; and `civic-buildings.md` §2 says *"twenty-nine skill buildings stand"*. 26 is the corrected
figure and is the one that checks against the rosters.

**7. The `hall` subtitle and the hub's own §5 dressing are both guild halls.** `hall` is *the Guild
Hall* (`RAT.3`) and §5 authors the `town-hall` landmark as *"the guildhall"* under the subtitle *the
Court House*. No announced name collides. But these two are the era's closest same-era pair by
function and form, and §5's separation argument for the hub is written against **the chapter house**
— a chain instance that under the re-dressing ruling is never drawn. The separation the era actually
needs is the hub against `RAT.3`, and no document makes it. Made below.

**8. §5 wants `RAT.3` long and the ratified footprint gives it a square plot.** §5: *"rectangular,
its length along the street."* The closure: *"RAT.3 (hall) … take[s] the square full plot."* §0's
constraint 3 requires the mesh to fill 95% of its footprint span, so a 2:1 plan on a 1:1 plot leaves
plot depth empty — the same failure era one measured on the Hut Cluster in the other direction.
Briefed below as a frontage on a square footprint, with depth behind it.

**9. The era's authored height order names buildings that will not be drawn.** §3's order, tallest
first, is *the bell tower*, then *the chapter house* and *the guildhall* level with one another,
then *the jettied row*, *the tithe barn*, *the guild workshop*, and *the kitchen garden* lowest.
**Only the guildhall is drawn.** Worse, four of the others are near-homonyms of roster buildings the
guide explicitly makes different: the tower house is *"markedly shorter and stouter"* than the bell
tower and *"never competes for the skyline"*; `RAT.3`'s guild hall is kept below the chapter house;
`RAT.2`'s store is *"shorter by a bay or two"* than the tithe barn; `RAT.1`'s workshop is *"bigger
on every axis"* than the guild workshop. **So the order cannot be carried over by name.** A derived
order for the six buildings era five actually raises is given below, marked as derived.

**10. The Chapel's footprint disagrees across files.** `era-05-medieval/civic-buildings.md` §2 says
**1×1** and the shipped `packages/economy/src/civicCatalogue.ts` agrees —
`row("medieval_chapel", "medieval", "gold", "The Chapel", "blend", 1, 1, 1920, 160, 160)`. But
`eras/README.md`'s near-collision pass calls it *"era five's civic **The Chapel** (the blend,
1×2)"*. **Briefed at 1×1**, two sources against one, and one of the two is shipped code.

**11. The Chapel's material sits outside §2's four.** The catalogue gives *"dressed stone, lead
roof, oak windlass frame."* §2's stone is **coursed rubble stone in mortar**, and the guide is
pointed about it: *"era four's fine level bed is gone, and the difference between the two is this
era's whole relationship with its predecessor."* Dressed stone is era four's signature. Briefed as
the catalogue words it, with the divergence flagged rather than silently substituted.

**12. Height is stated two ways across the era's two files.** §3 gives an order and says the guide
*"deliberately gives no world-unit targets"*; `civic-buildings.md` gives ~13, ~11, ~5 and ~8 units.
The same contradiction era two's brief left open. Used below only as the relative order the civic
file implies.

---

## The theme brief

*Read once. Every building below inherits all of it, and none of them restates it.*

Era five is **a walled town crowded onto the previous city's stonework, wearing its timber frame on
the outside.** The signature move is that frame: oak posts, rails and braces divide every wall into
panels filled with lime-washed daub, and **the pattern you see is the load path** — a curved brace
where the frame would rack, close studding where it carries — so take the pattern away and the
building falls down. It survives the distance the camera holds because a frame is a dark line on a
pale field, and a line survives being small where carved detail does not. **Four materials and no
more:** oak frame with lime-washed daub infill as the signature and the primary body, a pale
off-white field divided by dark structural timber, the timber riven and slightly irregular in
section, the members meeting at pegged joints rather than butting, the daub sitting very slightly
proud or shy of the frame face and never flush, and the panel varied rather than gridded — close
studding where the frame is proudest, wider panels with a curved brace elsewhere; **coursed rubble
stone in mortar** for undercrofts, plinths, thresholds, chimney bases and defensive work, squared-ish
stone in thick uneven joints, always the lower part of a building so stone reads as the ground the
frame stands on; **clay roof tile and slate** on every roof, small units in overlapping courses with
a sagging ridge line and a visible eaves course, steep enough that **the roof plane is a face in its
own right under the three-tone model rather than a cap**, and on the smaller buildings covering more
of the elevation than the wall does; and **lead**, the era's only cool note above ground level, in
spires, gutters, valleys and flashings and in the came holding glass — **leaded glass lives inside
the lead row**, small diamond quarries held in lead, so glass is a jewel set into a wall and never a
surface and never a large opening. Buildings **stand up by being braced and propped from outside**,
and the whole apparatus is visible: the **pointed arch**, so openings are tall and narrow rather
than wide and arches of different spans can rise to the same height, which is what makes an
irregular plan roofable; the **buttress**, a thickening of the wall that catches the outward push,
stepped back in stages as it rises; **jettying**, each storey oversailing the one below on projecting
joist ends, which is the era's most useful silhouette move and what breaks the vertical at every
floor; the **steep pitch** at fifty degrees and above, so the roof carries most of the height on
anything under three storeys and the ridge is the building's dominant line; the **reared truss**,
cruck blades or a king post assembled flat and stood up whole, with the tie beam and the blades
visible at the gable end; and **ground cobbled and failing** — small rounded setts in rough fans over
the previous era's sinking slabs, with the gutter down the middle of a lane rather than at its edges.
**One body hue for the whole era — lime-washed daub over stone `#9D9C8C`** — with dark oak and slate
`#5E4A3A` as the accent doing the structural drawing, sitting on the calm parchment base `#ECE4D3`
ground, `#D9CCB2` deep ground, `#8FA9B8` slate-mist water rather than competing with it; buildings
share the body hue and differ by **silhouette plus accent**, never by a second body colour.
**Ornament is moderate and almost all of it is the frame**, which arrives free with the structure,
so what gets added is thin and profiled: a carved bargeboard on a gable, a moulded string course
where the jetty projects, a chamfered doorway with a pointed head, crested ridge tiles. Where a
building needs to look more important it gets **a steeper roof or another jetty, never more
surface** — leave out tracery beyond a two-light head, foliage carving, figures, pargeting and
painted texts, all period-correct and none of it legible at zoom-out, and **spend on the ridge line
and the jetty shadow instead**, because a break in the silhouette reads at any distance. **Absent on
purpose, because each is a later era's signature move:** the dome on a drum and applied classical
symmetry as a system, both the Renaissance's announcement and the reason nothing here is symmetrical
for its own sake; window glass at any real size, also Renaissance; the iron frame and every
machine-made component, which wait for the Industrial era, **so no two parts of a building match
unless a hand made them match**; and reinforced concrete. What the era stops withholding, all three
held back by era four, is **the pointed arch, the buttress and the frame on the outside of the
wall** — the arch and the buttress being one idea seen twice, since a load taken up a steeper curve
leans harder outward and has to be propped. **Visible technology, and this era is unusually rich in
it:** the treadwheel crane under its shingled hood, the pole scaffold with its putlogs, the water
mill with an undershot wheel on a leat, the well-head windlass, the saw pit, the tracing floor, and
the bell — **which strikes rather than shows**, so a turret clock here has no dial worth reading;
keep the sound-making thing visible and the measuring thing hidden. Nothing implies the drum, the
pane, the machine-made unit or the cantilever: curves are pointed or segmental, and **everything
that projects is propped by something you can see**. One dating device survives into the finished
building and belongs on every wall here: **the putlog holes are not filled in**, so a finished wall
keeps a regular line of small dark squares under its eaves.

### Constraints that bind every image below

- **Three tone steps per surface under one key light** — top face lightened, the hue on the left,
  the right darkened. **No runtime lights**: no cast shadow, no ambient occlusion, no specular
  highlight, no rim light, no gradient. Never describe a building by the light falling on it. The
  roof plane is a face in this model, not a cap.
- **Emitted light is an emissive surface inside that model, never a light added to the scene.** The
  hub's hearth and its louvre are bright in themselves and light nothing around them. No warm pool
  on a floor, no glow on an aisle post, no lit smoke.
- **Footprints are frozen** (INV-ERA-1). Design to the plot named in each brief; never change which
  cells a building occupies. Cell side is `GRID_CELL = 4` world units, and the mesh fills 95% of its
  footprint span — a model is sized to its plot, not floating in it.
- **Height is a ranking, never a world-unit target.** A model is contain-fit to its plot by one
  uniform scale, so the more slender of two neighbours is simply the taller one, and a smaller plot
  shrinks a model whole rather than making it look tall. **Slenderness is a property of the model.**
  The 24-unit ceiling is far off; only era ten's mast approaches it.
- **Every building is modelled at its finished (`built`) stage.** Not the site stage with its
  tracing floor, not construction with its reared trusses, and not a mastery variant — mastery rides
  above a building as stars.
- **Mastery gold `#FFB703` is reserved.** It may never be a material and a body is never gold.
- **Every side must read.** The camera orbits a full 360° at a locked ~49° tilt, so there is no
  front and no hidden back. Nothing here has a decorated face and a blank rear.
- **No rebuses.** A skill building is ordinary architecture that happens to house a lesson and never
  symbolises it. **This era needs the reminder most**, because tithes, shares and quarters divided
  map so neatly onto division: the quarters may divide, the buildings may not carry the maths. No
  fractions on a façade, no counting the courses, no tally of sacks cut into a gable.

---

## The ten buildings

| # | Building | Class | Node / role | Plot |
| --- | --- | --- | --- | --- |
| 1 | the Weaver's Shop | skill | RAT.1, `workshop` | 2×2 |
| 2 | the Wool Store | skill | RAT.2, `store` | 2×1 |
| 3 | the Guild Hall | skill | RAT.3, `hall` | 2×2 |
| 4 | the Tower House | skill | RAT.4, `tower` | 2×2 |
| 5 | the Timber Houses *(merged; until the pass the files said the Gabled Row)* | skill | RAT.6, `dwelling` | 2×1 |
| 6 | the Court House | hub | `town-hall` | 3×2 |
| 7 | The Great Barn | civic | food | 2×2 |
| 8 | The Castle | civic | livability | 2×1 |
| 9 | The Fairground | civic | happiness | 2×2 |
| 10 | The Chapel | civic | blend | 1×1 |

**The height order for these ten, derived rather than quoted**, for the reason at defect 9. The era
raises six buildings and §3's authored order names only one of them. Tallest first: **the Tower
House**, the era's one vertical block and the most slender model on a square plot; **the Court
House**, level with the chapter house per §5 and therefore at the top of the roofed set, but earning
it by width and by the louvre on its ridge rather than by a vertical; **The Great Barn**, whose
height is all roof; **the Guild Hall**, kept below the hub; **the Timber Houses**, taller-looking
than their plot accounts for because the plot is mostly roof; **the Wool Store**, taller than the
workshop and below the row; **The Castle**, whose keep is its only vertical and whose wall head is
about half of it; **the Weaver's Shop**, the lowest roofed building the era draws even though it has
two storeys; **The Chapel**, whose bellcote is the tallest thing on its one cell; and **The
Fairground** lowest, with nothing on it above the cross and the poles.

---

### 1. the Weaver's Shop — RAT.1, `workshop` mass

**Plot: the square full plot, 2×2 (8×8u).** Ratified for this node, and it is the era's own decision
rather than the mass's: §5 keeps the inherited `workshop` instance on a single tile and says *"the
chain's is the small one"*, while this building is *"bigger on every axis"*. So it must fill an 8×8
plot and read as a shop rather than as a small house — the whole of that tension is the design
problem here.

> **Briefed on §5's corrected description, not the roster line** (defect 1). The roster still carries
> the chain's own words; §5 replaced them with the guild's own hall-workshop, and removed the tally
> board. If the consolidated pass restores the roster line, the tally board comes back and the
> first-floor meeting room, the hoist door and the trade sign go.

**Silhouette.** A two-storey half-timbered block over a stone undercroft, its first floor jettied
out over the shop front, under one steep tiled roof with a **hoist door set high in the gable** — and
at ground level the shutters folded down flat into counters, so the working floor opens straight onto
the street.

**How it stands up.** A coursed rubble undercroft in thick uneven joints carries the frame. Oak
posts, rails and close studding on the elevation with lime-washed daub panels between them; the
first floor jetties on projecting joist ends over a moulded string course. A reared truss over the
whole — cruck blades or a king post, tie beam and blades visible in the gable. Ground-floor shutters
are hinged at the sill and drop to horizontal on their own props; the hoist door in the gable head
has a gin wheel on a bracket above it. Openings above are tall and narrow with pointed heads.

**Materials and ornament.** A carved bargeboard down the gable and crested ridge tiles are the whole
of the applied ornament; the frame does the rest. Small leaded diamond quarries in the first-floor
windows. **A painted hanging trade sign on a wrought bracket at the corner** — the guild's device,
doing the identifying without a written name. Putlog holes in the undercroft and under the eaves.

**The detail that has to read: the counters, and what is painted on their backs.** A shutter folded
down carries **a painted mark on its inner face**, visible only because it is open — the sign
appears when the shop opens. Both long sides that face a lane get one.

**Props.** Barrels standing and on their sides, corded sacks in a pile, scales on a trestle, crates
under a lean-to, cobbled fans with a central gutter, cart ruts through mud. **No chalked tally
board** — §5 is explicit that this guild keeps its accounts upstairs and out of sight, and that is
the prop that separates it from the inherited workshop.

**Height.** **The lowest roofed building era five draws**, deliberately, even with two storeys: it
fills its plot and rises barely above it, which is what keeps it a working floor rather than a small
house.

**What it must not resemble.**

- **the Timber Houses (#5) — the sharpest pair in the era's own roster.** Both are jettied
  half-timbered blocks with steep tiled gables addressing a street. They separate on **plan and
  props, never geometry**: one wider building with a single trade behind one fold-down counter,
  against **three repeated narrow units** with no counters at all. The trade sign on its bracket and
  the hoist door in the gable belong to the shop and never to the houses.
- **Era four's Stonecutters' Shop and Surveyor's Shop** (`POL.1` and `POL.8`, both `workshop`, both
  2×2, both standing in Classical clothes). Separated **by era for free** — a colonnaded ashlar front
  against a framed elevation — and then on **aperture**: a colonnade you look between against a
  shutter that folds down to a counter.
- **Era one's Tool Shelter** (1×1) and **era three's Bronze Foundry**: era clothes plus scale.

---

### 2. the Wool Store — RAT.2, `store` mass

**Plot: the long two-cell strip, 2×1 (8×4u).** Ratified, and the shape is the plan: a cart-wide slot
runs through a barn end to end, so the building is emphatically longer than it is deep.

> **Briefed on §5's shut-and-barred doors** (defect 2), because §5 is the corrective text and because
> a shut barn is what separates this building from the civic Great Barn standing a few plots away.
> **If the consolidated pass restores the open doorway the name's rationale asks for, this building
> loses its clearest separation from The Great Barn** and the whole of it falls onto the tallyman's
> porch, the roof covering and the plot. Say so rather than discover it.

**Silhouette.** A tall barn on the long strip where **two-thirds of the elevation is one enormous
steep roof and the wall is the plinth it stands on**, with a small gabled porch built against one end
and a pair of tall cart doors in the long side, shut and barred.

**How it stands up.** Coursed rubble side walls carry a reared cruck roof whose blades spring from
low down the wall, tie beams and blades visible in both gables. Opposed cart doors under pointed
arched heads in the long sides with a threshing bay between them, **barred across with a drawn timber
beam**. The tallyman's porch is a small framed structure built against one gable — oak frame,
lime-washed daub panels, its own steep tiled roof — with a chamfered pointed doorway.

**Materials and ornament.** Coursed rubble to the eaves, **clay tile on the roof**, and the frame
appears only in the porch and in the gable blades — this is a stone building with a timber hat, which
is unusual in the era and is deliberate. Plain walls with **no buttresses**. A moulded string course
at the porch jetty; crested ridge tiles. Putlog holes in a regular line under the eaves.

**The detail that has to read: the bar across the cart doors, and the porch on the end.** The bar is
what says the contents are owed to somebody; the porch is where the render is taken. Both need to
read at zoom-out, so the porch is a separate small gabled mass and not a lean-to.

**Props.** Corded sacks in a pile at the porch door, an iron-banded chest, scales on a trestle,
**a chalked slate tally board on the porch wall, ruled in columns and part-wiped**, cart ruts through
mud, a mounting block by the porch door.

**Height.** Taller than the Weaver's Shop and below the Timber Houses, and shorter by a bay or two
than the inherited barn it is a parish version of. All of the gain is roof.

**What it must not resemble.**

- **The Great Barn (civic, #7) — the era's sharpest pair, and the era's own files flag it.** The
  subtitle row says the row *"also held a second barn against the civic **Great Barn**"*. They
  separate on **aperture, props and covering**:

| | the Wool Store (skill, 2×1) | The Great Barn (civic, 2×2) |
| --- | --- | --- |
| Cart openings | **Shut and barred.** A drawn timber beam across each | **Open, and a slot straight through.** Daylight on the far side |
| The end | **A tallyman's porch**, a separate gabled mass with a chalked board | Nothing. *"One enormous roof and nothing else"* |
| Walls | Plain coursed rubble | **Stepped buttresses** marching down the side walls |
| Roof | Clay tile | **Stone slate** |
| Plot | The long strip — a building you walk through | The square plot — a deep building whose roof dominates from every azimuth |

- **Era three's Treasury** (`LIN.4`, `store`) is the island's other sealed store — *"thick walls, one
  lockable bronze-fitted door and no other opening along its length"*. Separated **by era**: mud
  brick with bronze fittings against coursed rubble in mortar under tile, and era three's height is
  in its wall where era five's is in its roof.
- **Era four's Wine Cellars** (`POL.4`, `store`, 2×1): barrel-vaulted bay mouths onto a raised
  loading platform, in ashlar. Era clothes, and a row of open vault mouths against two barred doors.
- **Era two's Seed House** and **era one's Hide Shed**, both 2×1 stores: era clothes carry it
  entirely — a boarded box lifted on collared stumps and a low thatched shed with an open gable.

---

### 3. the Guild Hall — RAT.3, `hall` mass

**Plot: the square full plot, 2×2 (8×8u).** Ratified. §5 asks for a building *"long, its length along
the street"*, and the plot is square (defect 8), so **the frontage is long and the building has depth
behind it** — a stair turret and a rear range against the back of the hall — rather than a thin bar
on a square plot leaving half its cells empty. §0's 95% fill rule is what forces that reading.

**Silhouette.** A jettied upper hall floor carried over an **open ground-level market arcade**, one
steep tiled roof with a long ridge above it, and **daylight visible right through the arcade
underneath** from any azimuth. One dominant shape and one accent: the ridge, and the void beneath.

**How it stands up.** Oak posts on coursed rubble bases carry the arcade, its openings pointed
arches of unequal span rising to one height — which is exactly what the pointed arch is for and why
the arcade can be irregular. The upper floor jetties out over the arcade on projecting joist ends,
so the wall above oversails the posts below and the whole frontage steps out as it rises. Close
studding and lime-washed daub above; a reared truss per bay under the steep tiled roof, tie beam and
blades visible at both gables. A stair turret at one rear corner, framed, with its own small tiled
cap.

**Materials and ornament.** **This is where the era's ornament budget is best spent**, because it has
the longest jetty in the town: a moulded string course running the full length where the jetty
projects, carved bargeboards on both gables, crested ridge tiles. Leaded diamond quarries in the
upper windows, tall and narrow under pointed heads. Lead in the valleys. The arcade posts get
chamfered stops and nothing more.

**The detail that has to read: you can see under it.** The arcade must be genuinely open on the
street side and along the returns, with the far side visible through it. **Do not fill a bay**, and
do not let the jetty shadow close the void — the void is half the silhouette and it is the one thing
the hub does not have.

**Props.** **The market cross** — a stepped stone base with a shaft and a small canopy — standing at
the arcade's foot, which is what the lanes converge on. Barrels and corded sacks in the arcade
shade, scales on a trestle, a chalked slate tally board on an arcade post, a painted hanging trade
sign on a wrought bracket, cobbled fans with a central gutter running under the arcade.

**Height.** Among the era's tall things and kept **below the Court House**. Its height is a storey
plus a steep roof, never a tower.

**What it must not resemble.**

- **the Court House (the hub, #6) — the era's closest same-era pair, and no document separates
  them** (defect 7). Both are large guild-run halls under one steep tiled roof in an era whose civic
  power sat with the guilds. §5's own warning was written against a building that is never drawn, so
  the separation is made here, on **plan and props**:

| | the Guild Hall (skill, 2×2) | the Court House (hub, 3×2) |
| --- | --- | --- |
| Underneath | **Open.** A ground-level arcade you see through and enter anywhere along the front | **Closed.** A stone undercroft under the whole of it, entered once |
| Approach | Anywhere along the frontage, at ground level | **One external stair** to a first-floor door |
| The ridge | Plain, crested tiles, nothing on it | **A smoking louvre turret** straddling the ridge |
| Fire | None | **A great hearth in the middle of the floor**, emissive, with the louvre as its only opening |
| Plot | The square plot | The wide plot |

  Open-underneath against a solid undercroft with a smoking turret on top holds at full zoom-out,
  which is the test the convention sets.

- **Era four's Custom's House** (`POL.3`, `hall`, 2×2): an aisled basilica with a clerestory over the
  side ranges and an apse at one end, in ashlar. Era clothes, plus plan — a long axial shed entered
  at one end against a hall you walk under.
- **Era three's Merchants' Hall** (`LIN.1`, `hall`): a trade hall in mud brick, timber roof on a
  central row of posts, wide doors at both ends. Era clothes, and doors at both ends against an open
  arcade along a front.
- **Era two's Meeting House** (`RAD.3`, `hall`): a long mud-brick box open at both gable ends.
  **Note the shared read** — both let you see through the building — and separate on **axis**: era
  two's daylight runs *end to end along the ridge*, era five's runs *across the front, under the
  building*. Plus era clothes.
- **Era one's Roundhouse**: a closed thatch cone. No risk.

---

### 4. the Tower House — RAT.4, `tower` mass

**Plot: the square full plot, 2×2 (8×8u).** Ratified, and the reason is measured rather than
argued: era one showed a smaller plot makes a tower **shorter**, not more slender, because a
contain-fit applies one uniform scale. **Slenderness is a property of the model**, so author the
block markedly taller than it is wide and let the plot do nothing.

**Silhouette.** A **blunt square block of coursed rubble** under a flat-topped battlemented parapet
carried out on corbels, with an **external stone forestair** climbing one face to a first-floor door.
**No spire at all**, and no roof visible above the parapet.

**How it stands up.** Coursed rubble walls in thick uneven mortar joints carry a vaulted ground
store; the living floor sits over that vault; the parapet is corbelled out on projecting stone
brackets so the wall head steps *outward* just below the crenellations. The forestair is a straight
external flight on a solid masonry plinth, its head at a chamfered doorway with a pointed arch.
Openings are tall narrow lancets with small leaded diamond quarries — the era's largest glass, which
is small.

**Materials and ornament.** **The one building in the era with no exposed frame anywhere**, and that
absence is the point: the era's signature is deliberately withheld here, which is what makes it read
as defensive rather than commercial. Coursed rubble throughout, lead in the gutters behind the
parapet, and the corbel course under the crenellations as the whole of the ornament. Putlog holes in
a regular line below the parapet.

**The detail that has to read: the forestair, and that it goes to the first floor.** The ground
store's door is separate, low, and under the stair. A viewer at any azimuth should see that the way
in is *up*.

**Props.** A mounting block at the forestair foot, a horse trough, an iron-banded chest at the store
door, a woodpile under a lean-to, cobbled fans with a central gutter, cart ruts through mud.

**Height.** **The tallest thing era five draws**, and it earns that by proportion. But it is
*markedly shorter and stouter than a bell tower* and never competes for a skyline — it is a block
that happens to be tall, not a shaft.

**What it must not resemble.**

- **The Castle (civic, #8) — the worst collision in era five, and both files describe a square keep
  with a forestair and a battlemented parapet.** They separate on **plan and props, never geometry**:

| | the Tower House (skill, 2×2) | The Castle (civic, 2×1) |
| --- | --- | --- |
| What stands beside it | **Nothing.** A single free-standing block on a square plot | **A walled bailey running off it** along the strip, with lodgings under one continuous tiled roof |
| The far end | There is no far end | **A gate with a portcullis** |
| Frame | **None anywhere.** All coursed rubble | **Half-timbered lodgings** against the curtain's inner face — the era's frame, on the wall run |
| Wall head | Crenellations on corbels, and nothing on them | **Chimneys along the wall head with washing between them** |
| Props | A mounting block, a chest at the store door | **A well in the bailey** |

  One block against a block plus a long low range is a silhouette difference, so it holds at any
  zoom. The Castle's own file makes the same point from the other side: *"the strip is the wall …
  and the keep gives the silhouette its vertical."*

- **Era three's Stronghold** (`LIN.6`, `tower`): a corner bastion on undressed stone footings with a
  corbelled solid parapet, **reached only from inside**. This is closer than it looks — a stout
  masonry block with a corbelled parapet — and it separates on **props and era**: mud brick on a
  stone footing against coursed rubble in mortar, and above all **era three's has no way up on the
  outside while era five's whole read is the forestair**. A solid parapet against crenellations is
  the second tell.
- **Era two's Stone Tower** (`RAD.4`): a squat mud-brick drum with a heaped earth ramp up its back
  and a low dome. Round on the ground against a square block; plus era clothes.
- **Era one's Lookout**: an open lashed timber frame. Solid mass against a frame you see through.
- **Era four has no `tower` node**, so nothing Classical stands on this mass and the era's
  *Lighthouse* subtitle is inert.

---

### 5. the Timber Houses — RAT.6, `dwelling` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files said *the Gabled Row*.** Same building. See the rename
> section at the head of this document for where the current string lives and what the reversal
> costs.

**Plot: the long two-cell strip, 2×1 (8×4u).** Ratified, and the shape is the argument: *"a jettied
row of three narrow houses is a street frontage, which is the long plot's own shape."*

> **Briefed on the roster's three-narrow-house row, not §5's wall row** (defect 3), on three
> grounds. The roster table says three narrow houses; the subtitle row's own ratified rationale says
> the same (*"`RAT.6` is three narrow houses with steep tiled gables end-on to the street — the gable
> is what a learner sees"*); and §5's reason for moving it to a wall row was to separate it from the
> chain's jettied row round a back yard, **which under the re-dressing ruling is never drawn** — the
> inherited `dwelling` instance on this island is era one's Hut Cluster in Prehistoric clothes. The
> pressure that produced the wall row has dissolved. If the consolidated pass restores it, the backs
> go against the town wall, the ground behind disappears, the entry becomes a single covered passage
> and the row runs longer than three houses.

**Silhouette.** **Three narrow steep-tiled gables end-on to the street in a row**, each storey
oversailing the one below, so the frontage steps out twice as it rises and the roofline is a run of
three sharp triangles. **Only two dwellings stand on this island** — this and era one's Hut Cluster
— so the gables are what the era's housing *is*.

**How it stands up.** A coursed rubble plinth under each house. Oak frames with close studding and
lime-washed daub panels; **each storey jetties on projecting joist ends**, twice, so there are two
string courses up the frontage. A reared truss per house — cruck blades or a king post, tie beam and
blades visible in each gable, and the three trusses are **not identical**, because no two parts here
match unless a hand made them match. Coursed rubble chimney stacks rising at the party walls.

**Materials and ornament.** **Three carved bargeboards, one per gable, is where this building's
ornament goes** — it has more gable edge than anything else in the era. Moulded string courses at
each jetty, crested ridge tiles, leaded diamond quarries in the upper windows. Putlog holes across
the plinths. The three houses share a body hue and a frame and differ slightly in width and in panel
pattern, which is the era's honesty rule doing decorative work for free.

**The detail that has to read: the double jetty.** Two overhangs on one elevation, each with its own
shadow line under a string course, is what breaks the vertical at every floor and what the era
spends its budget on. Keep the two projections unequal.

**Props.** A well-head with a windlass and bucket, a midden gone grey behind a low wall, a woodpile
under a lean-to, a horse trough, cobbled fans with a central gutter, cart ruts through mud. It is
one of only two residences on the island, so it must read lived-in.

**Height.** Taller-looking than the plot accounts for, because the plot is mostly roof. Below the
Guild Hall and above the Wool Store.

**What it must not resemble.**

- **the Weaver's Shop (#1)** — see the table there. In one line: **three repeated narrow units with
  no counter and no sign, against one wider building with a fold-down counter, a hoist door in its
  gable and a trade sign on a bracket.**
- **The Castle (civic, #8) — same plot, same era, same fabric, and both are housing.** The Castle's
  lodgings are half-timbered too. They separate on **plan**: the Castle's lodgings run under **one
  continuous tiled roof** against the inner face of a curtain wall, with a keep at one end and a
  portcullis gate at the other; the Timber Houses are **three separate gables end-on** with no wall,
  no keep and no gate. **One long roof against three gables** is a silhouette difference and holds at
  zoom-out.
- **Era four's The Cottages** (civic, 1×2): four storeys, shops at street level, brick-faced
  dwellings above, small balconies, an external stair, a shallow tiled roof. Genuinely the same idea
  — housing stacked over commerce on a two-cell strip — and it separates on **era clothes and
  approach**: brick-faced concrete under a shallow roof reached by an external stair, against an oak
  frame under three steep gables reached from the street. Their strips also run on opposite axes,
  1×2 against 2×1.
- **Era one's Hut Cluster** (2×2), the island's only other dwelling: several small domed huts round
  an open yard, in Prehistoric clothes. Era plus plan.
- **Era three's The Walled Houses** and **era two's The Village Houses** (both civic, 2×2): ranges
  round an enclosed court, and flat-roofed cells round a doorway court. Era clothes, and a court in
  the middle against a frontage on a street.

---

### 6. the Court House — the hub, `town-hall`

**Plot: the wide plot, 3×2 (12×8u).** The era's landmark, unique by right, and **the only building
in the city that rethemes** — every other era's hub is not standing.

> **A name-against-form flag, reported not fixed** (defect 7). The subtitle is *the Court House* and
> §5 authors the form as *"the guildhall"*, while the `hall` mass's subtitle is *the Guild Hall*. No
> announced name collides — the hub is *"Civic Center, the Court House"* — but the era holds two
> guild halls in substance and the separation is made at #3 above.

**Silhouette.** **One long steep tiled roof over a single wide hall raised on a stone undercroft,
with a small open-sided tiled louvre turret standing on the ridge, smoking**, and an external stair
climbing to the hall door. Wide rather than tall. The louvre is not a decoration: it is the only
thing that tells a viewer there is a fire inside.

**How it stands up.** A coursed rubble undercroft, arcaded in pointed arches, carries the whole
floor above it. Oak aisle posts run down the room and carry the roof, their heads visible where the
gable is open to the eaves. A reared truss per bay — king post or cruck, tie beam and blades visible
at both gables. **The louvre is a small framed turret straddling the ridge**, its sides open and
louvred, under its own little tiled cap with lead flashings and lead valleys where it meets the main
slope. A straight external stair on a masonry plinth rises to a first-floor door with a chamfered
pointed head.

**Materials and ornament.** Lead does more work here than anywhere in the era — the louvre's
flashings, the valleys, the gutters — and it is the era's only cool note. Crested ridge tiles run to
the louvre from both directions. A carved bargeboard on the main gable, a moulded string course at
the undercroft head, leaded diamond quarries in the hall windows under pointed heads.

**Emitted light, and it is the whole of this building's read.** **The great hearth in the middle of
the hall floor and the mouth of the louvre are emissive surfaces inside the three-tone model** —
bright in themselves, lighting nothing. No warm pool on the floor, no glow on the aisle posts, no lit
smoke. A plume rises from the louvre and is not itself lit. **This is the era where the communal fire
moves indoors for the first time in five eras**, and the louvre is the whole of the fix: it gives the
smoke an opening of its own at the ridge and nowhere else, so the building reads as a fire from every
azimuth the camera orbits to. Without it there is no fire visible at all.

**The detail that has to read: the louvre on the ridge, smoking.** It must be a separate small mass
on the ridge line with air visible through its louvred sides, not a vent and not a lantern. At full
zoom-out it is the one thing that distinguishes this building from every other big roof on the
island.

**Props.** **The market cross** at the stair foot, barrels and corded sacks in the undercroft
arches, a chalked slate tally board at the stair head, scales on a trestle, an iron-banded chest, a
mounting block at the stair foot, cobbled fans with a central gutter.

**Height.** Wide rather than tall, and level with the tallest roofed room in the town — the first
era in which the landmark is as tall as the hall, which suits an era whose civic power sat with the
guilds. Below only the Tower House among the buildings era five draws.

**What it must not resemble.**

- **the Guild Hall (#3)** — the table is there. In one line: **open underneath and entered anywhere,
  against a solid undercroft entered once by a stair, with a smoking louvre on the ridge.**
- **The Great Barn (civic, #7)**: one enormous steep roof over a wide plan is the barn's read too.
  Separated on **plan and props**: the barn's roof comes down over plain buttressed stone walls with
  cart openings driven through them and **nothing on its ridge**; the hub stands on a visible arcaded
  undercroft, is entered up a stair, and carries the louvre.
- **Era three's The Steam House** (civic, 3×2): a vaulted mud-brick hall over a plunge basin, **and it
  smokes too** — steam under the vault, smoke from the furnace end. Separated on **where the smoke
  comes out**: era three's from a furnace end at one gable, era five's from a turret on the ridge; plus
  era clothes and the undercroft.
- **Era four's The Baths** (civic, 3×2): vaulted frigidarium, domed caldarium, colonnaded palaestra
  court. Era clothes, and a dome is absent from era five entirely.

---

### 7. The Great Barn — civic, food *(2×2)*

**Plot 2×2 (8×8u). Cost 1,280. Food for ~320.** The era's only food source. A square plot, so it is
a **deep** building rather than a long one, which is what lets its roof dominate from every azimuth.

**Silhouette.** **One vast steep roof, out of proportion to everything around it**, with stepped
buttresses marching down the side walls and a cart-wide slot driven straight through the middle. Its
whole character is the roof; the walls are what it stands on.

**How it stands up.** Coursed rubble side walls with **stepped buttresses** taking the outward thrust
of the roof, stepped back in stages as they rise. An **oak cruck roof**: blades reared whole and
springing from low down the wall, so the roof structure and the wall structure are one thing, with
tie beams and blades visible in both gables. Opposed cart entries under pointed arched heads with a
threshing bay between them, **open**, and daylight visible on the far side.

**Materials.** Coursed rubble stone, oak cruck framing, and **stone slate rather than clay tile** —
which is the material choice that separates it from the Wool Store and should be visible as larger,
greyer, less regular units than any other roof in the era. No exposed frame on the elevation at all
except the cruck blades where they show in the gables.

**Props.** Corded sacks in a pile, barrels, drifted chaff, cart ruts through mud, a woodpile under a
lean-to. Deliberately no office and no signage: *"one enormous roof and nothing else — no secondary
benefit at all."*

**Height.** The tallest of the civic four, and all of its height is roof.

**What it must not resemble.** **the Wool Store (#2)** — the table is there. In one line: **this one
is open, buttressed, deep, and slated; that one is barred shut, plain-walled, long, tiled, and has a
porch on its end.**

---

### 8. The Castle — civic, livability *(2×1)*

**Plot 2×1 (8×4u). Cost 1,440. 320 livability.** The cheapest livability per cell in the era, and it
sprawls — two of these eat a quarter's frontage. The strip is not a castle's shape and INV-ERA-1
freezes it, so **the strip is the wall**: the one castle element that genuinely is long and thin.

**Silhouette.** **A square keep at one end giving the silhouette its single vertical, with a walled
bailey running off it down the strip** under one continuous tiled roof, and a gate with a portcullis
at the far end. Read along the strip it is one tall thing and one long low thing.

**How it stands up.** The keep is coursed rubble with a forestair to a first-floor door and a
battlemented parapet on corbels. The curtain wall is coursed rubble, heightened, with **lodgings
built into its inner face** — half-timbered, oak frame and lime-washed daub, under one continuous
clay-tiled roof pitched back against the wall. The gate is an oak-leafed opening under a pointed arch
with a portcullis in its groove.

**Materials.** Coursed rubble stone, **half-timber lodgings**, clay tile, oak gate. It is the one
civic building in the era that shows the era's frame.

**The detail that has to read: the wall head is inhabited.** **Chimneys along the wall head with
washing strung between them** is what makes this housing rather than a fortress, and it is the
building's whole argument — *"the whole town lives inside it."* A well stands in the bailey.

**Props.** The well, washing, a woodpile under a lean-to, a horse trough, a mounting block by the
gate, cobbled fans with a central gutter.

**Height.** The keep's parapet is the second-tallest civic point in the era and the wall head is
about half of it — so the profile falls sharply from one end to the other.

**What it must not resemble.**

- **the Tower House (#4)** — the table is there. In one line: **nothing is attached to the Tower
  House, and everything is attached to the Castle.**
- **the Timber Houses (#5)** — the era's other housing, also half-timbered. **One continuous roof
  against three separate gables**, plus the keep, the gate and the curtain.
- **Era three's The Walled Houses** (civic, 2×2): mud-brick ranges on three sides of an enclosed
  court with a single gated entrance. Genuinely close in idea — enclosed housing round a court behind
  one gate — and separated on **era clothes and vertical**: era three has flat roofs used as living
  space and no tall element at all; era five has a keep, a pitched tiled roof and crenellations.

---

### 9. The Fairground — civic, happiness *(2×2)*

**Plot 2×2 (8×8u). Cost 1,600. 320 happiness.** **The only civic building in the era that is mostly
open ground — and, since era five puts no node on `yard`, the only open ground era five adds at
all.** It needs its openness and that is what it pays for on land efficiency.

**Silhouette.** **Mostly ground**, set out for the annual fair: beaten earth and cobble with **a
stepped stone cross standing at the centre**, trestle booths and awnings round three sides, a roped
ring at one end, bunting strung between poles, one pollarded tree. It should look like a day off
rather than a working day.

**How it stands up.** Barely, and that is correct. The cross is the only built thing: a stepped
stone base carrying a shaft with a small canopy at its head. Everything else is temporary — oak
trestles, canvas awnings on poles, cord and bunting, a rope on stakes. Cobbled fans with a central
gutter run across part of it and the rest is beaten earth, muddy in the low spots.

**Materials.** Cobble and beaten earth, **dressed stone for the cross**, oak trestles, canvas awnings
and bunting. No frame, no tile, no lead.

**The detail that has to read: the cross at the centre.** It is the one permanent vertical on the
plot and the only stepped stone cross on the island. At zoom-out it is the whole of this building's
identity, so it must be tall enough to clear the awnings and read as steps, shaft and canopy.

**Props.** Trestle booths with awnings, bunting between poles, the roped ring, a pollarded tree, a
horse trough, cart ruts through mud, cobbled fans. Kept festive, never worked: no scales, no sacks,
no tally board.

**Height.** The lowest thing era five adds. Nothing above the cross and the poles.

**What it must not resemble.**

- **Era four's Barracks** (`POL.2`, `yard`, 2×1): sawn blocks stacked in courses, a timber
  shear-legs hoist, chippings underfoot. Era clothes, plus **working against festive** — a hoist and
  heaped stone against booths and bunting.
- **Era three's Ingot Yard** (`LIN.5`, `yard`): open to the sky with a stone weighing table, a hand
  balance on a trestle and a graded weight set in a banded chest. **Trestles on open ground in both**,
  so separate on **props**: a balance and weights against booths, awnings and a roped ring — and on
  the cross, which era three has nothing like.
- **Era one's The Campfire** (civic, 2×2): a wide ring of undressed stone with a fire at the centre,
  seating logs and hide mats, earth worn pale. **Also 2×2 mostly-open ground with something at the
  centre.** Separate on **the centre and the props**: a fire ring with logs round it against a
  stepped stone cross with booths round it — and era five's centre does not burn.
- **Era two's Sheep Pen** (`RAD.2`, `yard`, 2×2): a continuous run of hurdling whose **fence is the
  building**, with a race narrowing into a catching pen. Separate on **the boundary**: era two's plan
  is a rectangle with a smaller rectangle notched into it and nothing standing inside; era five is
  open on the near side with booths round three and a cross in the middle.
- **Era one's Clearing** (`NUM.4`, `yard`, 1×2): swept earth, a hearth ring, boulders, a drying rack,
  one tree. Era clothes and plot.

---

### 10. The Chapel — civic, blend *(1×1)*

**Plot 1×1 (4×4u), the smallest plot in the era. Cost 1,920. 160 livability + 160 happiness.** The
premium buys a plot: both dials on one cell. **Briefed at 1×1** — the catalogue and the shipped
`civicCatalogue.ts` agree, against `eras/README.md`'s 1×2 (defect 10).

**Silhouette.** **A tiny stone chapel whose tallest thing is a bellcote gable pierced for one bell**,
with a lancet window in the side and **a covered well against the side wall** under its own small
lean-to roof, a windlass over it. Water and comfort on one cell.

**How it stands up.** Masonry walls carry a steep roof end to end; the **bellcote is the gable wall
itself carried up above the ridge and pierced with one arched opening** for the bell, so the bell is
part of the wall rather than a stage on a tower. A lancet — tall, narrow, pointed — in the side wall,
with small leaded diamond quarries in it. The well's lean-to is a low oak frame on the side wall with
a windlass barrel on two uprights.

**Materials.** **Dressed stone, a lead roof, an oak windlass frame** — as the catalogue gives them.
*(Flagged, defect 11: **dressed stone is not one of §2's four materials**, and coursed rubble in
mortar is, with the guide pointed that era four's fine level bed is gone and that the difference is
"this era's whole relationship with its predecessor". The consolidated pass owns which one this
building takes. The **lead roof** is right either way and is the era's only cool note, so it will
read as the coolest small object on the island whichever stone it gets.)*

**The detail that has to read: the bellcote.** It is a thin pierced gable, not a tower and not a
turret, and it is what makes a 4×4 building legible as a religious one at full zoom-out. **The bell
strikes rather than shows** — no dial, no clock face anywhere on it.

**Nothing on this building emits.** No candle, no lit window, no glow behind the lancet: the leaded
quarry is a jewel set into a wall, not a lamp. **This is the era's one building whose institutional
reading comes entirely from silhouette rather than from a fire**, and that is what makes the
separation below work.

**Props.** The covered well and its windlass, a bucket, a horse trough, a beaten path worn to the
door, cobbled fans with a central gutter. A hurdle fence at the plot edge if anything is needed at
all.

**Height.** ~8 units to the bellcote against the Fairground's ~5 — so on a single cell it reads
noticeably tall for its plan, which is what a 1×1 needs in order not to disappear.

**What it must not resemble.** The blend row is where the run's collisions come from, and **five 1×1
blend buildings stand on this island at once**, because civic buildings freeze in the era they were
built. Four of the five are water. Taken in order of how close they actually are:

- **Era two's The Village Well (civic, 1×1) — the sharpest neighbour on the ground, and no naming
  pass could see it, because these two names share nothing.** Same role, same plot, both permanent,
  **and a windlass in both.** They separate on **mass and subordination**:

| | The Village Well (era 2, 1×1) | The Chapel (era 5, 1×1) |
| --- | --- | --- |
| Is it a building? | **No.** A low stone ring parapet with an open timber windlass frame over it, and nothing else | **Yes.** A walled and roofed room you cannot see into |
| The windlass | **The whole silhouette.** The frame is the building | **Subordinate.** Tucked against a side wall under its own small lean-to |
| The tallest thing | The windlass frame | **The bellcote gable** |
| Materials | Undressed stone and timber, and **no metal anywhere** | Dressed stone under a **lead** roof |

- **Era three's The Trading Post (civic, 1×1)**: a small square stone-footed building with a
  projecting timber canopy and a great balance beam under it. **Closest in mass** — a small masonry
  building with something projecting from it on one cell. Separate on **the head and the props**: a
  flat projecting canopy with a balance beam and graded weights under it, against a pierced bellcote
  gable with a well at the foot.
- **Era four's The Fountain (civic, 1×1)**: a paved court with a basin fed by a visible aqueduct
  pipe, benches under two clipped trees, a low wall, ~5 units. Separate on **mass**: open ground with
  a basin on it against a building with water beside it.
- **Era one's The Spring (civic, 1×1)**: water rising in a kerbed rock hollow under a hide awning on
  three poles. Era clothes carry it entirely.
- **Within era five: the Tower House (#4).** A bellcote is not a tower. Keep it a thin gable wall
  pierced for one bell, never a stage, and never crenellate it.

---

## The cumulative confusion set

**Step 5 of the skill scopes "what it must not resemble" to an era's own siblings, and from era three
onward that is too narrow.** Under the 2026-07-29 no-re-dress ruling a skill building is drawn once,
keeps that look permanently and is never demolished, and D-ERA11 freezes every civic building in the
era it was built. **So an era-five city has era one, two, three and four buildings physically
standing on it**, each in its own era's clothes. The per-building sections above name the collisions;
this section records the population they were scoped against, so the next reader does not have to
re-derive it.

### What is actually standing when era five is current

Derived from the ten roster tables rather than from any summary. **The hub is the exception and it
matters**: the town hall is the one building in the city that rethemes, so **there is exactly one
landmark on the island and it wears era five's clothes**. Era one's Stone Circle, era two's Shrine,
era three's Council Hall and era four's Senate House are **not** standing.

| Mass | Standing at era five, oldest first | Count |
| --- | --- | --- |
| `hall` | Roundhouse (1) · Meeting House (2) · Merchants' Hall (3) · Custom's House (4) · **Guild Hall (5)** | 5 |
| `store` | Hide Shed (1) · Seed House (2) · Treasury (3) · Wine Cellars (4) · **Wool Store (5)** | 5 |
| `dwelling` | Hut Cluster (1) · **Timber Houses (5)** | **2** |
| `workshop` | Tool Shelter (1) · Potter's Kiln (2) · Bronze Foundry (3) · Stonecutters' Shop (4) · Surveyor's Shop (4) · **Weaver's Shop (5)** | **6** |
| `yard` | Clearing (1) · Sheep Pen (2) · Ingot Yard (3) · Barracks (4) | 4 — **era five adds none** |
| `tower` | Lookout (1) · Stone Tower (2) · Stronghold (3) · **Tower House (5)** | 4 — era four has no tower node |
| `town-hall` | **the Court House (5) only** | 1 |

**26 skill buildings plus one hub**, which is the figure the guide's header gives and which checks
against the rosters: 6 + 5 + 5 + 5 + 5. **Plus twenty civic buildings**, four per era, all frozen.

**Two results from this table are worth reading before drawing anything.** `workshop` is the crowded
mass with six standing, so the Weaver's Shop needs the most separation work. `dwelling` is the empty
one with two, because eras two, three and four put no node there — so the Timber Houses carry the
island's housing almost alone, and their real competition is **civic**: The Castle beside them and
era four's Cottages a quarter away.

### Era four in full, as the adjacent era sharing the most structural vocabulary

Read from `era-04-classical/style-guide.md` and `civic-buildings.md`, because era four's brief may not
exist yet. **Era four is a small port city built to a line, in cut stone, out of one bay repeated** —
dressed ashlar limestone in lime mortar, terracotta roof tile, lime plaster and stucco, and the timber
truss, with the colonnade and the true semicircular arch as its signature. It **withholds the pointed
arch, the buttress and the exposed timber frame and names era five as the era it is saving them
for**, and its stucco *"must never be divided into panels by visible studs."*

**That is the whole of why the two eras separate for free, and it should be stated positively rather
than relied on silently:** era four is a **pale ashlar city of counted semicircular bays with fine
level joints**, era five is a **pale-daub-and-dark-oak town of pointed arches and thick uneven joints
whose walls are divided into panels by the frame**. A viewer never has to compare two buildings to
tell an era-four one from an era-five one; the joint and the panel do it at a glance. Era four's body
hue is `#D2C8AA` with a terracotta `#B4674A` roof accent against era five's `#9D9C8C` body with a
dark-oak `#5E4A3A` accent, so even the palettes separate. *(Both body hues moved on 2026-07-30 —
see `docs/superpowers/specs/2026-07-30-era-palette-ladder.md`. The pair separated on ΔE76 11.2
before and 18.4 after, so this paragraph's claim is stronger than when it was written, not
weaker.)*

**Every era-four building era five stands beside, and how the pair separates:**

| Era four | Mass / role | Era five neighbour | Axis |
| --- | --- | --- | --- |
| Stonecutters' Shop (`POL.1`, 2×2) | `workshop` | the Weaver's Shop | Colonnaded ashlar front open on one side against a framed elevation with a fold-down shutter counter |
| Surveyor's Shop (`POL.8`, 2×2) | `workshop` | the Weaver's Shop | Enclosed ashlar with long benches, floor **not** visible from outside, against a shop front that opens onto the street |
| Custom's House (`POL.3`, 2×2) | `hall` | the Guild Hall | A long aisled shed with a clerestory and an apse, entered at one end, against a hall you walk **under** |
| Wine Cellars (`POL.4`, 2×1) | `store` | the Wool Store | A row of open barrel-vault mouths on a raised loading platform against two cart doors barred shut with a porch on the end |
| Barracks (`POL.2`, 2×1) | `yard` | The Fairground | A shear-legs hoist and heaped sawn stone against booths, bunting and a stepped cross |
| The Grain Dock (2×2) | civic food | The Great Barn | A low ashlar-and-brick box with loading doors along one side and a paved apron, against a building that is almost entirely one steep slated roof |
| The Cottages (1×2) | civic dwelling | the Timber Houses | Four brick-faced storeys reached by an external stair under a shallow roof, against three oak-framed gables reached from the street; strips on opposite axes |
| The Baths (3×2) | civic amenity | the Court House | A vaulted hall with a **dome** on its hot room — and era five has no dome at all |
| The Fountain (1×1) | civic blend | The Chapel | Open paved ground with a basin, against a roofed building with a bellcote and the water outside it |
| — | `tower`, `dwelling` | — | **Era four has no node on either**, so its *Lighthouse* and *Shop Row* subtitles are inert and nothing Classical stands on those masses |

**Nothing in era four collides with era five on form.** The one pair that needed real thought is the
`store` pair, because both are long two-cell buildings holding goods, and it resolves on aperture:
era four's whole answer to *contents on show* is a front you can see through, and era five's is a bar
across the door. That is a genuine opposition rather than a difference of degree.

### Eras one, two and three, scanned for exact form collisions

Era two's brief is written and locked at `output/imagegen/era-02-neolithic-building-briefs/README.md`
and was read from there; era three's is in flight, so its source documents were read. **No exact form
collision was found.** Every candidate resolves on era clothes plus one further axis, and the ones
worth recording are:

- **Era three's Stronghold against the Tower House.** The closest of all the older neighbours: both
  are stout masonry blocks with a corbelled parapet. **Era three's is reached only from inside** and
  era five's whole read is an external forestair, and era three's parapet is solid where era five's
  is crenellated. Handled at #4.
- **Era three's Treasury against the Wool Store.** Both sealed stores. Era three puts its height in
  the wall and era five puts it in the roof, and era three's one lockable door has bronze fittings —
  the first metal on the island — which era five does not use.
- **Era three's Ingot Yard and era one's Campfire against The Fairground.** Both are open ground with
  something at the centre or on trestles. The stepped stone cross is what saves era five, and it is
  the only one on the island.
- **Era two's Meeting House against the Guild Hall.** Both let daylight through the building. Era
  two's runs end to end along the ridge; era five's runs across the front, underneath.
- **Era two's Village Well against The Chapel.** A windlass in both, on the same plot size, in the
  same role. **The sharpest cumulative collision in this whole scan**, and handled in full at #10.
- **Era two's Stone Tower against the Tower House.** A round mud-brick drum with an earth ramp
  against a square coursed-rubble block with a forestair. Safe on plan and on era, and worth naming
  only because both names carry *Tower*. That cell moved during this run: it read **the Grain Silo**
  at `3095767` and the lead's lock to **the Stone Tower** merged in `#256`, so at `2814951` era five's
  *Tower House* stands one era on from an era-two *Stone Tower*. **The one-namespace check cleared it
  and the pair passes the folder's own qualifier test** — *stone* and *tower-house* are not synonyms
  — but note that era two's name is deliberately **not** a description of its fabric: era two's
  building is a mud-brick drum with stone only at its footing, while era five's really is coursed
  rubble throughout. **Era five's is the island's only genuinely stone tower**, and that is the
  cleanest way to keep the two apart.
- **Era one's six.** All safe on era clothes alone — thatch, rammed earth, lashings and undressed
  stone against a framed and tiled town. The Hut Cluster against the Timber Houses is the only pair
  on a shared mass, and it separates on plan as well as era.

### The one named near-collision: era two's Shrine against era five's Chapel

**The uniqueness pass flagged these two as the nearest neighbours by family in the whole 121-name
set** — same institution, different century, three eras apart, no shared noun and no shared
qualifier — and it recorded the finding *"reported rather than ruled"*, on the ground that this is the
pattern that produced the era six / era nine hospital swap.

**First, the merge state, because it changed during this run and the two halves landed separately.**

- **Era two's hub is named *the Shrine*, and has been for both tips.** `eras/README.md`'s cross-era
  row and era two's own subtitle row carry it at `3095767` and at `2814951`.
- **The ruling that era two's communal oven *is* its sacred hearth is now MERGED, in `#256`.** It was
  **not** at the tip when this brief was begun: era two's guide at `3095767` still carried the
  mismatch as **open**, with three ways out offered and none taken — *"the name is applied as
  instructed and the mismatch is the lead's to close, three ways: re-author the landmark, take a
  third name, or rule that the hub's fire is a shrine's fire … but it is a design ruling and not
  this pass's to take."* At `2814951` the third option is taken: era two's `style-guide.md` carries
  a **RULED** banner headed *"ERA TWO'S COMMUNAL OVEN IS ITS SACRED HEARTH"*, and its brief closes
  the flag. **So the ruling can now be quoted as merged rather than claimed.**
- **Nothing about era two's form moved with it**, which is why nothing below changed when the
  ruling landed: the ruling's own words are *"the silhouette, the raised platform, the communal
  querns, the clay finials … all stand exactly as authored"*. The separation this section makes was
  drawn against that form and is unaffected by which way the name question went.

**Second, a mechanical correction that changes what the separation is for.** These two do **not**
stand on the island at the same time, and the reason is the one exception the re-dressing ruling
made: **the town hall is the only building in the city that rethemes.** `eraDressing.ts`'s hub alone
resolves against `CURRENT_ERA_ID` while every other building resolves against its own era, so at era
five there is exactly one landmark and it is the Court House. **Era two's Shrine is not on the ground
in era five.**

**Third, the separation is still owed, on three grounds that survive that correction — and the third
is the real one.**

1. **The names share one namespace permanently.** The uniqueness gate puts all 81 skill dressings,
   the ten hubs included, in one list with the 40 civic names and requires all 121 to be distinct,
   because a subtitle is now permanent. A learner who reaches era five has already met *"Civic
   Center, the Shrine"* and will meet *The Chapel* on a buy menu.
2. **If a hub is ever held rather than rethemed**, the pair lands on the ground and the separation is
   owed there.
3. **The Shrine's form is standing at era five under a different name.** Era two's civic **The Bread
   Oven** is the same object minus the canopy — *"a domed clay oven big enough for the settlement's
   bread, dominant and standing in the open"*, on a swept 2×2 yard, its mouth emissive — and it is
   frozen in era two by D-ERA11, so it is on the island in era five and for the rest of the run. Era
   two's own brief calls the Shrine / Bread Oven pair *"the sharpest confusion in the era"*. **So the
   sacred-hearth form is permanently present even though the Shrine name is not**, and the Chapel has
   to be separable from it.

**How era five's Chapel separates, on scale, plan and props and never on geometry:**

| | era two's the Shrine *(hub, 3×2)* — and the form that is actually standing, **The Bread Oven** *(civic, 2×2)* | era five's The Chapel *(civic, 1×1)* |
| --- | --- | --- |
| **Scale** | The era's landmark on the wide plot; the Bread Oven fills a 2×2 swept yard. **The oven alone is larger than era five's whole chapel** | **One cell, the smallest plot in the era** |
| **Plan** | **A fire in the open with a roof over it** — a long low thatch canopy on heavy posts, no walls anywhere, air on every side between the posts. You look *at* the oven | **A walled and roofed room you cannot look into.** Four walls, one lancet, and the water is *outside*, against a side wall |
| **The head** | **A horizontal canopy ridge with a moulded clay finial at each end** — wide, low, and the width is where its authority comes from | **A vertical bellcote gable pierced for one bell** — thin, and the tallest thing on the cell |
| **Props** | Communal querns set round a raised earth platform, flour worked pale into the ground, sheaves in a stook, an era-one tally post standing unused | A covered well with an oak windlass against the side wall, a bucket, a beaten path |
| **Emission** | **The oven mouth and the flue are emissive.** The building's entire read is a fire | **Nothing emits.** No candle, no lit window, no glow behind the lancet |
| **Fabric** | Fired clay, thatch, heavy timber posts, undressed stone at a platform edge | Dressed stone under a **lead** roof — the era's only cool note, and the coldest small object on the island |

**The two axes that hold at full zoom-out are emission and the head.** A wide low canopy with a
bright oven mouth burning under it, against a small closed stone box with a thin pierced gable and
nothing burning at all. **Era five's chapel is the one building in the run whose sacred reading comes
from a silhouette rather than from a fire**, and that is exactly what makes it unmistakable beside a
sacred hearth: the Shrine says *religion is where the fire is*, and the Chapel says *religion is a
shape against the sky*. A player who has met one will not take the other for it from any azimuth.

---

## Compressed, for prompting

*Every building in three to five sentences, for pasting into an image generator. **Prepend the theme
brief and the constraint list**; these do not repeat them. Silhouette, load path, the materials that
differ from the era default, the one detail that has to read, and the single confusion to avoid.*

**the Weaver's Shop — skill — RAT.1, `workshop` — 2×2 (8×8u).** A two-storey half-timbered block over
a coursed rubble undercroft, its first floor jettied out over the shop front under one steep tiled
roof, with a hoist door set high in the gable and the ground-floor shutters folded down flat into
counters. The undercroft carries the frame, the jetty rides on projecting joist ends over a moulded
string course, and a reared truss shows its tie beam and blades in the gable. The detail that has to
read is what is painted on the inside of a folded-down shutter, visible only because the shop is
open, with a painted trade sign on a wrought bracket at the corner; there is deliberately no chalked
tally board, because this guild keeps its accounts upstairs. Do not let it read as the Timber Houses:
one wider building with a counter and a sign, never three repeated narrow units.

**the Wool Store — skill — RAT.2, `store` — 2×1 (8×4u).** A tall barn on the long strip where
two-thirds of the elevation is one enormous steep roof and the coursed rubble wall is only the plinth
it stands on, with a small gabled porch built against one end. Rubble side walls carry a reared cruck
roof whose blades spring from low down the wall, and the opposed cart doors sit under pointed arched
heads and are **barred shut with a drawn timber beam**. Its walls are plain with **no buttresses** and
its roof is **clay tile**; the details that have to read are the bar across the doors and the porch as
a separate gabled mass, with a chalked slate tally board on the porch wall. Do not let it read as The
Great Barn, which is open, buttressed, deep and stone-slated.

**the Guild Hall — skill — RAT.3, `hall` — 2×2 (8×8u).** A jettied upper hall floor carried over an
open ground-level market arcade under one steep tiled roof, with daylight visible right through the
arcade from any azimuth; the frontage is long and the depth behind it is real, because the plot is
square. Oak posts on rubble bases carry pointed arches of unequal span rising to one height, the
upper floor jetties out over them, and a reared truss spans each bay. The era's ornament is best
spent here: a moulded string course the full length of the jetty, carved bargeboards on both gables,
and the detail that has to read is simply that **you can see under it** — never fill a bay. Do not
let it read as the Court House, which has a solid undercroft, one external stair and a smoking louvre
on its ridge.

**the Tower House — skill — RAT.4, `tower` — 2×2 (8×8u).** A blunt square block of coursed rubble
under a flat-topped battlemented parapet carried out on corbels, with an external stone forestair
climbing one face to a first-floor door, and **no spire and no visible roof**. The walls carry a
vaulted ground store with the living floor over it, the parapet corbels step the wall head outward
just below the crenellations, and the openings are tall narrow lancets. It is **the one building in
the era with no exposed frame anywhere**, and that absence is what makes it read as defensive; the
detail that has to read is that the way in is *up*, with the store's low door separate and beneath
the stair. Do not let it read as The Castle: nothing at all is attached to this block — no curtain
wall, no gate, no bailey, no range beside it.

**the Timber Houses — skill — RAT.6, `dwelling` — 2×1 (8×4u).** *(Merged; the files said* the Gabled
Row *until the consolidated pass, which also retired the note that had rejected* Timber *as a
material name.)* Three narrow steep-tiled gables end-on to the street in a row, each storey
oversailing the one below, so the frontage steps out twice as it rises and the roofline is a run of
three sharp triangles. A coursed rubble plinth under each house, oak frames with close studding, two
jetties on projecting joist ends, a reared truss per house with its tie beam visible in the gable,
and rubble chimney stacks at the party walls — the three trusses deliberately not identical. Three
carved bargeboards, one per gable, are where the ornament goes, and the detail that has to read is
the **double jetty**: two unequal overhangs on one elevation, each with its own shadow line. Do not
let it read as The Castle's lodgings, which run under one continuous roof against a curtain wall.

**the Court House — hub — `town-hall` — 3×2 (12×8u).** One long steep tiled roof over a single wide
hall raised on an arcaded coursed rubble undercroft, with a small open-sided tiled louvre turret
standing on the ridge and smoking, and an external stair climbing to the hall door. The undercroft
carries the floor, oak aisle posts carry the roof, a reared truss spans each bay, and the louvre is a
small framed turret straddling the ridge with lead flashings and lead valleys where it meets the main
slope. **The hearth in the middle of the floor and the mouth of the louvre are emissive surfaces —
bright in themselves, lighting nothing** — and the louvre is the detail that has to read, because it
is the only thing that says there is a fire inside from any azimuth the camera orbits to. Do not let
it read as the Guild Hall, which is open underneath and has nothing on its ridge.

**The Great Barn — civic, food — 2×2 (8×8u).** One vast steep roof out of all proportion to
everything around it, with stepped buttresses marching down the side walls and a cart-wide slot
driven straight through the middle with daylight on the far side. Coursed rubble walls take the
outward thrust in buttresses stepped back as they rise, and an oak cruck roof springs from low down
the wall with tie beams and blades visible in both gables. Its roof is **stone slate, not clay tile**
— larger, greyer and less regular than any other roof in the era — and there is no exposed frame on
the elevation at all. Do not let it read as the Wool Store: this one is open, buttressed, deep and
slated, and it carries no porch, no office and no signage of any kind.

**The Castle — civic, livability — 2×1 (8×4u).** A square coursed rubble keep at one end giving the
silhouette its single vertical, with a walled bailey running off it down the strip and half-timbered
lodgings built into the curtain wall's inner face under one continuous clay-tiled roof, and a
portcullis gate at the far end. The keep has a forestair to a first-floor door and a battlemented
parapet on corbels; the strip is the wall, which is the one castle element that genuinely is long and
thin. The detail that has to read is that **the wall head is inhabited** — chimneys along it with
washing strung between them, and a well in the bailey — because that is what makes this housing
rather than a fortress. Do not let it read as the Tower House, which stands entirely alone, or as the
Timber Houses, which are three separate gables and not one long roof.

**The Fairground — civic, happiness — 2×2 (8×8u).** Mostly open ground set out for the annual fair:
beaten earth and cobble with a stepped stone cross standing at the centre, trestle booths and awnings
round three sides, a roped ring at one end, bunting strung between poles, one pollarded tree. Almost
nothing is built — the cross is a stepped stone base carrying a shaft with a small canopy, and
everything else is oak trestles, canvas and cord — and it should read as a day off rather than a
working day. The detail that has to read is the cross: the only permanent vertical on the plot, tall
enough to clear the awnings, and the only stepped stone cross on the island. Do not let it read as
era three's Ingot Yard or era one's Campfire: no balance, no weights, no fire ring, and nothing here
burns.

**The Chapel — civic, blend — 1×1 (4×4u).** A tiny stone chapel whose tallest element is a bellcote
gable pierced for one bell, with a lancet window in the side wall and a covered well against the side
wall under its own small lean-to roof, a windlass over it. The walls carry a steep roof end to end and
the bellcote is the gable wall itself carried up above the ridge and pierced, so the bell is part of
the wall rather than a stage on a tower. Its **lead roof** is the era's only cool note and makes it
the coldest small object on the island; the catalogue also gives it dressed stone, which sits outside
the era's four materials and is flagged for the documentation pass. **Nothing on it emits** — no
candle, no lit window, no glow behind the lancet — and the bellcote is the detail that has to read.
Do not let it read as era two's Village Well, which is a windlass frame over a ring parapet and no
building at all: here the windlass is subordinate and the bellcote is the silhouette.

---

## Related

- `docs/superpowers/specs/eras/era-05-medieval/style-guide.md` — the era's materials, structural
  language, ornament, the roster, the masses as reference, the construction stages, the props kit,
  the subtitle row and the advisor.
- `docs/superpowers/specs/eras/era-05-medieval/civic-buildings.md` — the four bought types with
  their footprints, costs and capacities, and the era's resource.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` — §0's nine hard constraints and
  §6's frozen footprint table, which is the only copy of it.
- `docs/superpowers/specs/eras/README.md` — the ten eras, the re-dressing ruling's folder-wide
  consequences, the cross-era subtitle table and the one-namespace check.
- `docs/superpowers/specs/eras/era-04-classical/style-guide.md` and its `civic-buildings.md` — read
  in full for the cumulative confusion scan, era four's brief not existing yet.
- `output/imagegen/era-02-neolithic-building-briefs/README.md` — era two's locked brief, read for
  the era-two half of the scan.
- `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md` and its `civic-buildings.md` — read
  for the era-three half, that brief being in flight.
- `packages/skill-graph/src/eras.ts` — `ERA_SEQUENCE`, the authority on era five's node set.
- `packages/economy/src/materials.ts` and `packages/economy/src/civicCatalogue.ts` — the era's
  material id and the four shipped civic rows.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produced this document.
