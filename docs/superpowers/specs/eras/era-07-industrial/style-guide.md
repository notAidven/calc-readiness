# Era 7 — Industrial Era: style guide (skill buildings)

**Status: PROPOSED.** The era's visual language is authored below — materials, structural
language, ornament, the seven masses and their shape language, the three construction stages and the props
kit. **Nothing in this guide is open**, as of 2026-07-29. The road design had been the sharpest
item, on the grounds that this era's island makes it a depth-guard constraint rather than a matter
of taste; it is settled here for all four late eras, and the closure records that **D-ERA30 has
since dissolved the guard half of that argument**, so the rule now rests on looks and modelling
cost.

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
> - **Its own 6 new nodes' buildings**, on four masses, and this is now the guide's main deliverable.
>   **A building drawn here has that look for the rest of the run** — nothing gets a second pass,
>   where before a weak drawing was replaced at the next advance. **Two pairs share a mass — `FUN.1`/`FUN.7` on `hall` and `FUN.3`/`FUN.8` on `workshop`** — so both need separating by plan, scale or props, never by geometry (`../README.md`).
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

**Era id:** `industrial` · **Domains:** part of **D7** Functions & Coordinate Geometry after the
renumber (**D6** today) **plus `POL.5`** from Polynomials · **New nodes:** 6 ·
**Buildings standing by the end of this era:** 38 · **Era multiplier:** ×64

**Why this era, per `../../2026-07-27-era-progression-design.md` §3:** *A machine is input to
output; railways on plotted grids.*

---

## Notes before authoring

**This was the largest intake of any era and is no longer.** Eleven nodes against the
Renaissance's two was the imbalance D-ERA3's curation existed to fix, and **PR #180 fixed it** —
the Functions split landed, `CG.1` went to the Renaissance, `POL.5` arrived, and eleven became
six. Both ends of the old imbalance now sit inside the authored 3-9 pacing band.

**Its Functions domain id moves under the renumber**, from D6 today to D7. Node ids do not change.

**This is where the road question gets sharp, and it is a real constraint rather than a note.**
§5.1 of the era design records that layered paving and maximum island size arrive together in
the late eras — the worst case for the depth guard. An era with kerbs, tram rails and painted
markings on a large island is exactly the combination that fails `depthPrecision.test.ts`.
**If any era's roads need to be single-surface with markings baked into the texture rather than
stacked geometry, it is this one and the three after it.** The rule, stated once in §5.1:
whenever an era's road has more than one stacked surface, those surfaces must stay resolvable
at the *largest* island the game will ever show, not the island current when the art is made.

---

## 1. The era in one line, and its signature move

**One line:** a working town assembled from machine-made parts and dark with its own smoke.

**The signature move — the standard part, repeated without limit.** Every era since era four has
repeated something: a stone bay counted along a wall, a frame panel, a pilaster spacing. In all
of them **the repetition was the work of a hand trying to match itself**, so no two units were
identical and the wall carried the evidence. Here the units are identical because a machine made
them that way. Machine-made brick to one size, cast-iron columns from one pattern, glazing bars
rolled by the yard, window openings that are the same opening thirty times over — and the
consequence is a building with **no natural end**. A Renaissance elevation is a composition and
has a middle; a mill elevation is a rhythm and simply stops where the site does.

That is the read to design for, and it is a difference in kind rather than in degree. **Length,
not composition.** Bays are equal, corners are plain, the centre is not marked, and where a
building needs to be more important it gets **more bays or a taller storey**, never a face. It
also solves the zoom-out test almost for free: a strict rhythm of dark openings in a dark wall
reads at any distance, which is the one thing this era has going for it visually, because its
colours have nearly all gone.

**The tally descendant: the printed ledger and the enamel plate.** Era one predicted this one —
*notches on a post become a chalked slate becomes a printed ledger becomes a display panel* — and
the printed ledger lands here, ruled in columns, bound, and lying open on a desk or a counter. The
enamel plate is its outdoor half: a small rectangle of vitreous enamel, white on dark, screwed to
a wall, carrying a number rather than a name. **The mark has become fixed, standard and issued**,
which is exactly what the era does to everything else it touches. One era from now the same
information will be lit from behind.

---

## 2. Materials

Four, and one of them is a colour rather than a substance.

| Material | Read | Notes for modelling |
| --- | --- | --- |
| **Machine-made brick, soot-darkened** | The body of everything. Uniform in size, laid in strict courses, and darkest where the weather does not wash it | The uniformity is the point: identical units, thin even joints, and no coursing irregularity anywhere. Soot sits unevenly — heavy under sills and cornices, washed pale where rain runs — so the darkening is a pattern of shelter and not a tint over the whole wall |
| **Cast and wrought iron** | Columns, roof trusses, glazing bars, gantries, railings, shutters. Near-black and always thin | Iron's whole argument is slenderness, so nothing made of it should be as thick as a masonry equivalent. Cast for compression, in repeated patterned sections; wrought for ties and rods, which read as lines. It reads as structure and never as ornament |
| **Sheet glass in quantity** | Roofs, clerestories, sawtooth north lights, and openings the size of a wall | Panes are large enough now to make a roof out of, so glazing arrives in fields divided by bars. Under the three-tone lighting model a glazed plane should read as a lighter, flatter face than any masonry one, with the bar grid on it |
| **Slate** | Pitched roofs, and the darkest surface on the island | Thin, close-lapped courses in an even grid, sized down towards the ridge, cold grey-black. Where a roof is not glazed it is slate, and the two together make the era's roofscape |

**Timber survives only as floor and roof boarding inside**, and the demotion is worth naming.
Wood carried six eras — era one lashed it, era five drew it on the outside of the wall — and here
it is a material nobody sees. A player who has watched timber do the structural work since the
first settlement should find it gone from every elevation in this one.

**Explicitly absent, because they are later eras' signature moves:** reinforced concrete and the
cantilever, both the Atomic Age's announcement, so nothing here projects without a bracket or a
column under it; aluminium and plate glass, also Atomic, so glazing stays divided by bars;
the unitised curtain wall and composite cladding, which wait for the Information Age; and
emissive surface — anything that glows of its own accord — which waits for the Cyberpunk era, so
light here comes from a flame in a lamp.

**What this era stops withholding: cast and wrought iron as structure, machine-made brick, and
sheet glass in quantity.** **Iron AS STRUCTURE has been held back since era three's bronze** —
the qualifier is the whole of the rule, and it is the same one the sentence above states — which
is six eras of restraint spent on a single silhouette, and it should be spent conspicuously: a
glazed span carried on iron is the one building on the island that no earlier era could have
stood up.

> **CORRECTED 2026-08-01 — the sentence above dropped "as structure" and it is the line earlier
> eras are read against.** It read *"Iron in particular **has been held back since era three's
> bronze**"*, which forbids the material outright, four eras wider than the rule it was
> restating one line up. **Nothing in eras four to six was ever asked to give up iron as a
> smith's product** — a tie, a hinge, a nail, a strap, a grate forged one at a time — and era
> five's island section says so explicitly (*"Iron as a smith's product … is not what §2
> withholds"*). What era seven releases is iron **carrying the building**: the column, the truss,
> and the frame.
> This is the quotable sentence an era four, five or six artist reads to learn what they may not
> draw, so the qualifier travels with it. **The value of the release is unchanged**, and the
> release is still the era's proudest arrival.

---

## 3. Structural language

**Buildings stand up on a frame, and the wall has stopped being structural.** Era six composed a
masonry elevation to a drawing. Here a grid of iron columns and beams carries the floors and the
roof, brick fills between them, and every part of the building is a component that arrived on a
cart to a size somebody specified.

- **The regular structural bay.** The organising unit of everything: equal spacing, repeated as
  far as the plot allows, with the bay expressed on the elevation by a pier, a pilaster strip or
  the openings themselves.
- **The iron column and the iron truss.** Slender, repeated, and visible inside through the
  glazing. A truss makes a span nobody has to put a wall under, which is what makes one enormous
  room possible.
- **The long span, and the ridge lantern over it.** The era's proudest structure: one roof over
  one room, with a glazed ridge running the full length to light the middle of it.
- **The sawtooth roof.** A row of asymmetric pitches with the steep face glazed and facing north,
  so a deep floor is evenly lit. It reads at zoom-out as a serrated ridge line and is this era's
  most recognisable roof.
- **The segmental brick arch over openings**, shallow and repeated, sometimes with an iron
  lintel behind it. No keystone, no surround, no moulding.
- **The chimney.** A free-standing brick shaft, tapering, banded at the top, and taller than
  anything else on its plot. It is a structure in its own right and it is what smoke needs now.
- **Ground made hard.** Setts and engineering brick where wheels run, **iron rails let into the
  surface**, and cinder rolled flat everywhere else.

**Heights are stated as an order, and this guide deliberately gives no world-unit targets.**
Every stage is contain-fit to its plot by **one uniform scale**, so the same model stands at two
different heights on two different plots and a number is not something the person authoring one
can aim at. The **ranking** is what an era owes, and it survives re-authoring.

**This era's order, tallest first:** the water-and-clock tower, with **the engine house's chimney
immediately behind it** — the top two are both nearly all height and neither is a room, which is
new; then the market hall; then the brick terrace; then the brick warehouse, pushed up a floor by
its hoist; then the fitting shop; and the works yard lowest. **The gap between the top and the
bottom is wider here than in any era before it**, because the tall things are now structures
rather than buildings while the low things have not moved at all. The 24-unit ceiling is still
clear; only era ten's mast is authored to approach it. **The works yard's ground plane has not
risen since era one** — coal stacks and one plane tree stand on it, nothing more.

---

## 4. Ornament and visible technology

**Ornament level: low, and it is all in the repetition.** There is no applied decoration worth
the name — what a mill has instead is a rhythm, and the only things added to it are structural
consequences given a slightly better profile: **corbelled brick courses under the eaves**, a
string course in a contrasting brick, a moulded cornice on the chimney's top band, cast-iron
spandrel panels between window heads and sills, and a plain stone lintel where a door matters.
Where a building needs to look more important it gets **more bays or a taller storey**, never
more surface.

**What to leave out.** Polychrome brick patterning, terracotta enrichment, moulded brick panels,
carved keystones and the Gothic revival's whole repertoire — all period-correct, all invisible at
the distance the camera holds, and several of them at odds with the uniformity the era is for.
**Spend on the profile of the eaves and the rhythm of the openings instead.**

**Visible technology, and this is the richest era in the run for it:** the steam crane on rails,
the boiler and its chimney, line shafting on hangers under a roof, the hoist gantry over a
loading door, the gasholder, rails let into setts with a turntable at the junction, the
weighbridge, the water tank on its stage, gas lamps on standards, and a plume of steam vented at
low level. Almost all of it is machinery for **moving and measuring**, which is a change from era
six's instruments for deciding.

**D-ERA8 needs watching harder here than anywhere else in the run.** This era is full of dials,
gauges, indicator boards and graph-plotting instruments — the very things the lessons in it are
about. **A building may stand next to a dial and may not become one.** No gauge faces enlarged to
architectural size, nothing plotted on a wall, and no curve drawn where a curve is what the
lesson teaches.

**Nothing that implies concrete, the cantilever, sheet cladding or emissive surface.** Everything
that projects is carried by a bracket or a column, every wall is a material laid up in units, and
every light is a flame in a glass.

---

## The skill buildings this era introduces

**AUTHORED, not provisional — and this era shrank from eleven nodes to six.** These are the
curated sets from `ERA_SEQUENCE` in `packages/skill-graph/src/eras.ts`, which **answered O-1 in
PR #180 (merged 2026-07-28)**. Titles verbatim from `../../../../Node_Spine_v4.md`.

**What the curation did here**, and it is the largest change of any era: `CG.1` moved out to the
**Renaissance**; `FUN.4`, `FUN.5`, `FUN.6`, `FUN.9` and `FUN.10` moved out to the **Atomic Age**;
and **`POL.5` moved in** from the Classical Era, because it requires `CG.1` and `FUN.1` and so
could not be taught earlier. What remains is deliberately coherent — **the
function-as-machine half of the Functions split**: notation and evaluation, domain and range,
piecewise, composition (machines in series) and inverses (a machine run backwards).

| Node | Lesson | Mass | What it is in this era |
| --- | --- | --- | --- |
| FUN.1 | Use function notation; evaluate functions; determine whether a relation is a function (vertical-line test) | `hall` | A machine hall: iron-framed, glazed clerestory, line shafting overhead on regular bays |
| FUN.2 | Determine domain and range | `store` | A bonded warehouse, brick bays with iron shutters, a hoist gantry on the street elevation |
| FUN.3 | Evaluate and graph piecewise-defined functions | `workshop` | An erecting shop: one tall sawtooth bay, a travelling crane on gantry rails down its length, full-height doors at the gable end |
| FUN.7 | Compose and decompose functions | `hall` | An assembly hall, iron trusses, a glazed monitor roof running the ridge |
| FUN.8 | Determine one-to-one; find & verify inverse functions | `workshop` | A cannon factory: one tall brick casting house with a sunken casting pit and a stubby cupola flue, a glazed iron-framed boring range along one flank |
| POL.5 | Graph quadratics: vertex, intercepts, min/max | `tower` | A hydraulic accumulator tower: a blank square brick tower, a cast-iron weight case rising in its head, a lifting gantry across the top, pipes running out at its foot |

> ## ⚑ `FUN.8` IS RE-AUTHORED AS THE CANNON FACTORY — a FORM change, and the most expensive one in the pass
>
> **The lead is adding a defence lineage, one building per era from era three onward, and era seven's
> entry is `FUN.8`.** The row above used to read *"A pattern shop, timber-racked upper floor over a
> brick ground floor, external hoist door"*. **A previously pending name for this cell, *the Machine
> Factory*, is SUPERSEDED and not applied** — `output/imagegen/era-07-industrial-building-briefs/README.md`
> flagged it as a form mismatch against the pattern shop and offered the lead three ways out; **the
> lead took the second one and re-authored the building**, so the mismatch is closed by moving the
> form rather than by moving the name back.
>
> **THE COST WAS SHOWN TO THE LEAD AND ACCEPTED, so it is recorded rather than argued.** That brief
> set the price out in as many words: re-authoring this node *"would cost the timber racking, the
> external hoist door and the two-storey block, i.e. all three of the things separating it from
> `FUN.3`."* All three are indeed gone. **The sharpest of them is the timber**: §2 demotes timber in
> this era to *"floor and roof boarding inside"* and says *"a player who has watched timber do the
> structural work since the first settlement should find it gone from every elevation in this one"* —
> and the pattern shop's racked upper floor was **the era's one permitted appearance of timber above
> floor level**, the single exception that made the demotion legible by contrast. **Era seven now has
> no timber above floor level anywhere.** That is a real loss and it is the lead's to have accepted;
> what it buys is that §2's sentence is now true without an exception attached, which is the
> compensation and is not nothing.
>
> **The three separators are replaced rather than merely removed**, and §5's workshop entry names
> them: the **square plot against `FUN.3`'s long one**, the **casting pit and the wall crane against
> a travelling crane running down a length**, and **fire** — nothing on `FUN.3` burns. **The sawtooth
> is deliberately KEPT** on the boring range, because §5's own rule is that the era's three workshop
> instances separate by scale, plan and props and **never by geometry**, so taking the era's workshop
> roof off one of them would have been the wrong fix even when a foundry invites it.
>
> **The plot is `FUN.8`'s existing one and is not being asked to move.** `NODE_FOOTPRINTS` in
> `../../../../../apps/web/src/city/worldLayout.ts` gives `"FUN.8": { w: 2, d: 2 }` — **the square
> full plot** — closed by this guide's own footprint block and frozen by INV-ERA-1. **Two Cannons in
> adjacent eras is accepted**: era six's `RAT.5` becomes the **Cannon Tower**, a gun platform, and
> this is a works that casts guns.
>
> **One tone constraint the form carries, and it is not optional.** `../../../../Game_Visual_Design_Brief.md`
> §2 requires calm and non-punishing throughout, so **this building manufactures and never fights**:
> barrels lie cold, horizontal and unmounted, nothing is aimed, nothing is loaded, there is no
> target, no soldier and no smoke of firing. It is a foundry whose product happens to be ordnance.
> The **lesson-framing** ban at the foot of this guide is unchanged and is a separate rule — see the
> note there, which also corrects what it cites.

**This era holds two domains**, one of three that now do. `ERA_SEQUENCE` carries **no domain field
at all** (INV-ERA-5), so era membership is over node ids and a two-domain era is unremarkable.

**Already standing from earlier eras: 32**, each keeping its own era's look.

> *(This figure was headed **"Re-dressed from earlier eras"** until the 2026-07-29
> re-dressing ruling. Those buildings are not re-dressed; the count is kept because it is a
> true statement about how much city stands here, and is cited from `../README.md`'s table.)*

Brick, iron and glass arrive here, so every earlier building
gains a regularity it did not have.

**Footprints are not yet authored for these six** — they resolve to `DEFAULT_FOOTPRINT`, 2×2
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

**Per D-ERA8 none of these symbolises its lesson.** The accumulator tower is not "the parabola
building"; it is ordinary industrial infrastructure — a weighted ram that keeps the dock cranes
in pressure — that happens to host POL.5. Nothing on it curves in order to explain a curve, and
nothing on it plots or arcs: **a lesson about a falling, rising shape is exactly the one a tower
must not illustrate**, so the weight case is a straight cast-iron box in a straight brick shaft.
This era is full of dials and gauges — the buildings may be *near* them, they must not *be* them.

---

## 5. The seven masses, re-dressed

> **REFERENCE ONLY since 2026-07-29, and read this before drawing from it.** The re-dressing
> ruling (this guide's head banner, and era design §6.1) means **no mass in this section is ever
> re-dressed**. What is still owed here is the era's look for the **four masses** its own **6 new
> nodes** sit on; the treatment of every other mass, and the forward chain through it, is kept as
> the best available description of that mass's **shape language** and will not be built.
>
> **The section is deliberately not cut**, because whoever draws this era's own new building on a
> mass still needs to know what that mass *is* — and because a chain break recorded here is a
> finding about the shapes rather than about a re-dress.

Era one set seven masses and froze their plots, and this era inherits a chain six links long. The
six new nodes above take the same masses, several of them twice, so **a mass can carry more than
one dressing here** — the dressing below is the one carrying the chain, and a roster entry on the
same mass is a further instance of it, differentiated by **scale, plan and props rather than by
new geometry**, as era four's basilica and **tholos** are. *(Corrected 2026-07-29 from "basilica and
odeon". `POL.7`'s odeon is a **Renaissance** node, so era four does not draw it and never did:
`../era-04-classical/style-guide.md`'s HISTORY banner records that the pair the sibling guides
should cite is the **basilica and the tholos**, which still exists and separates on the same axis —
a hall with a face against a hall you walk round. Four of the six references were corrected with
that banner; this was one of the two left.)* This era needs that more than any other: it
puts two dressings on the hall, two on the workshop and one on the tower, so with the chain's own
versions those three masses read three, three and two. **The tower pair is the one this guide
missed**, and it is corrected below.

**The six ordinary types, and era one's mass names for them.** Per §6.1 of the era design the six ordinary types are dwelling, workshop, store, hall,
tower and yard, and **since 2026-07-29 those six words ARE the mass ids** — so there is one
vocabulary here rather than two. Era one's guide and `buildingAssets.ts` had kept the retired
Gridwork art's own names (*deco*, *slab*, *rowhouse*, *school*, *park*) because that art was
what the ids were coined for; the old-to-new mapping was **already one to one**, so no mass
was reused and no two nodes collapsed onto one id. **Nothing on disk moved** — a GLB filename
is built from the node id, never from the mass. Plus the `town-hall` landmark.

**Footprints are frozen, and this guide does not restate them.** INV-ERA-1 lets an era change
silhouette, height and material and never which cells a building occupies, so plots are named in
words: the hall and the dwelling share **the square full plot**; the store is **the long two-cell
strip**; the yard is **the two-cell strip on the short axis**; the workshop has **a single tile**;
the landmark has **the wide plot**. The table lives in
`../era-01-prehistoric/style-guide.md` §6 and that is the only copy of it.

**The tower's plot is deliberately not named**, for the reason
`../era-02-neolithic/style-guide.md` §5 records: it was set to a single tile and reverted to the
square full plot on 2026-07-28, because a contain-fit applies one uniform scale and a smaller plot
therefore shrinks a model whole rather than making it slender. **Slenderness is a property of the
model.** So this guide describes the tower's proportions and lets era one's table own its cells.

**Hall — the iron-and-glass market hall.** *Through-line: one big communal roof.* The
square full plot. **One glazed span over one room**, carried on iron trusses springing off slender
columns, with a brick base storey under it and **a ridge lantern running the full length** of the
roof. **Still the tallest roofed room in the city**, with only the tower and the chimney standing
over it. The chain's continuity here is the roof and not the plan: era one's cone of
thatch, era two's drum, era four's ring of columns, era six's dome were all round, and **the
circle finally goes in this era** because a truss is straight and a rolled glazing bar wants to
run in a line. What survives is the thing that always mattered — one span, one room, no interior
walls — and it goes on surviving as a concrete shell, a transit concourse and an interchange hall.

**Three halls stand in this era, and the market hall carries the chain.** FUN.1's machine hall is
full of line shafting and is a place of work; FUN.7's assembly hall has a monitor roof along its
ridge and is a place people sit in. The chain's market hall is **the one that is empty and
public** — a span with the ground under it left clear, entered from every side, with the goods
and the crowd as its only contents. Keep the market hall's base storey lowest and its glazing
largest, and keep the other two visibly occupied by their machinery and their seating; scale,
plan and props separate all three without a new roof shape between them.

**Store — the brick warehouse.** *Through-line: a long horizontal roof, contents on show.*
The long two-cell strip. **Regular bays** of machine-made brick under a shallow slate roof, iron
shutters on every opening, and **a hoist gantry projecting over the street elevation** with a
loading door under it at every floor. **The tallest this mass has ever stood**, because a hoist
makes an upper floor worth having and the store has never had a reason to climb before.

**Chain flag: this is where *contents on show* stops meaning daylight and starts meaning a door
left open.** For six eras the answer was an opening you could see through — a rolled-up hide, a
gable end, a colonnade, an arcade. A warehouse with iron shutters is a building designed to be
shut, and when the shutters are down the contents are not merely hidden but obviously secured.
**The through-line survives on one condition: one bay stands open on every warehouse**, with the
hoist working, a load half-lifted, and goods on the pavement below it. FUN.2's is the bonded
version — sealed by law, and the one that stays shut — so the chain's is the one that must
be caught in the act of loading. It becomes a concrete depot with roller shutters, then a retail
block, and finally a louvred monolith that advertises its contents rather than showing them.

**Dwelling — the brick terrace round a back court.** *Through-line: several small
dwellings, one shared yard.* The square full plot, shared with the hall. **Repeated bays** — one
door and one window per house, the same door and the same window every time — with **chimneystacks
standing in a rhythm** along the ridge, and the shared ground behind reduced to a paved back court
with washing lines across it and privies against the far wall. **A little over the warehouse and
well under the halls**, which is where this mass has sat since era four.

**The yard is at its smallest and most used here**, which is the honest state of this chain in
this era: the houses are packed, the court is the only open ground and it is doing laundry,
storage and sanitation at once. That is still several dwellings sharing one piece of open ground,
so the through-line holds — but this is the last era in which it holds by accident rather than by
design. It becomes a shared lawn, a podium courtyard, and a lit void in a rack.

**Workshop — the fitting shop.** *Through-line: a shaded open floor with something to
mark on.* A single tile, still the smallest plot on the island. A **sawtooth north-lit roof** over
a single room with benches down both walls, brick to the sills and glazing above, and **an enamel
notice plate by the door**. **Still the lowest roofed building in the city**, and kept that way
deliberately: it is a shed with good light and must never read as a small hall.

**Chain flag, and it is this guide's real strain.** *A shaded open floor* has been roofed over
completely for the first time in seven eras. Era four's portico had three open sides, era five's
shutters folded down into counters, era six glazed the wall but kept the doors wide — **a fitting
shop under a sawtooth roof has no open side left at all**, because the whole point of the roof is
to enclose a deep floor and light it from above. Pretending otherwise would be worse than
recording it.

**Proposed resolution: the open floor moves outside as a covered forecourt.** A bay of the same
roof pitch carried forward on iron columns over the paving in front of the shop, open on three
sides, with a bench, a vice on a post, work in progress and chalk marks on the flags — **and the
enamel plate hangs under it**, which gives the era's signage a home and the through-line a
visible floor. The room went indoors; the working ground stayed where it always was. It becomes a
test house with a dial board, then a sealed laboratory, and a signal lab.

**Three workshops stand in this era, and the fitting shop carries the chain — so the forecourt is
its alone.** This guide used to give the forecourt to all three *"because it is the only thing
keeping six eras of open floor legible"*, which gets it exactly backwards: a device that keeps
one chain legible stops distinguishing anything the moment every building on the mass has it, and
the roster nodes are not carrying that chain. `FUN.3` was also written in the chain's own words —
*"a fitting shop, sawtooth north-lit roof, benches down both walls"* — and is now **the erecting
shop**: one tall sawtooth bay rather than a shed's worth of small ones, a travelling crane on
gantry rails down its length, full-height doors at the gable end, and a **loading apron** outside
where the chain has a working floor.

**`FUN.8` is re-authored as the cannon factory, and it is the only building in the era with a fire in
it.** The form, in full:

> **A gun foundry: one tall square casting house in soot-dark machine-made brick, with a lower
> iron-framed boring range built against one flank.** The casting house takes most of the square plot
> and is **one volume the full height of the building** — no upper floor at all, so the elevation is
> unbroken brick from plinth to eaves, relieved only by the era's segmental arches. Its roof is
> **slate with a glazed ridge lantern running the length of the ridge** to let the heat out, and **a
> stubby cast-iron cupola flue breaks the slope near one end**: short, capped and unmistakably a
> furnace flue rather than a boiler chimney, so it never competes with the Engine House's stack,
> which stays the tallest thing of its kind on the island. In the gable, **one wide segmental-arched
> opening with iron doors folded back**, and through it **the casting pit sunk below floor level**
> with its moulding boxes ranked beside it and **a wall crane on a bracket** swung out over it. Along
> the flank, **the boring range: a low iron-framed run under a north-lit sawtooth, fully glazed down
> its long side**, with **the barrels lying horizontally in the boring machines**, one bore each,
> visible through the glass. **No hoist door up the face, and no timber on any elevation.** Outside,
> **a short spur of rail let into the setts** running in to the casting-house doors, and finished
> barrels **cold, horizontal and unmounted** in a cradle beside it. Nothing is aimed, nothing is
> loaded, and there is no target, no soldier and no smoke of firing anywhere on the plot.

**All three still keep the sawtooth**, deliberately, and the cannon factory keeps it on the boring
range: the convention separates instances by scale, plan and props and **not by geometry**, so taking
the era's workshop roof off one of them would be the wrong fix even though a casting house asks for a
vented pitch. **What separates the three now** is that the chain's fitting shop has a **covered
forecourt** you work on out front, `FUN.3` has an **apron you unload onto** at the end of a long tall
bay, and `FUN.8` has **a pit you cast into and a fire to feed it** — plus the plot, square against
`FUN.3`'s long strip, which is the axis that survives any zoom. *(This paragraph read: "`FUN.8`'s
pattern shop already separated cleanly, on a timber-racked upper floor over a brick ground floor with
an external hoist door … one has a hoist door up its face." All three of those separators went with
the form change; the banner under the roster table records that the lead was shown that cost and
accepted it.)*

**Yard — the works yard.** *Through-line: open ground deliberately kept open.* The
two-cell strip on the short axis. **Setts with iron rails let into them**, a **turntable** where
the rails meet, coal and timber stacked in squared heaps, and **one soot-black plane tree** at the
edge. **The lowest plot in the city**: the stacks are shoulder-high and the tree is the only tall
thing on it, and **the ground plane has not risen, here or in any era.**

**This is the era in which keeping the ground open is hardest to justify and most valuable**, and
the justification is functional rather than sentimental: a works yard is open because things have
to be turned, weighed and dropped on it, so the emptiness is what the yard is for. The rails do
the work of showing that, because a rail crossing a yard implies traffic without needing any.

**In all ten eras this is the one plot that never rises.** It becomes a municipal park, then a
dish yard on structure, and a steerable dish yard on a deck — none of them taller than this. That
is the chain's discipline rather than an oversight: while every other mass climbs towards the
ceiling, something has to hold the bottom of the band, and deliberately open ground is the only
honest way to hold it.

**Tower — the water-and-clock tower.** *Through-line: a slender open frame you climb to
see from.* A brick shaft with **an open iron tank stage** at the top — a riveted tank standing on
exposed iron legs above the masonry — **an external iron stair** climbing one face in flights, and
**a clock face under the cornice**. **The tallest thing on the island**, and still well clear of
the 24-unit ceiling that only era ten's mast is authored to approach. Author the shaft markedly
narrower than it is tall: the proportion delivers the height, not the plot it stands on.

**The climb is fully visible again, and this is the last era in which it has to be argued for.**
Era five's louvres half-showed it, era six's arcade showed it properly, and here **the stair is
simply on the outside** and the top stage is a frame with daylight through it. It becomes a
lattice pylon that opens the frame completely, then a comms mast on a podium, and a comms tower
brushing the 24-unit ceiling without exceeding it. Keep the stair external, keep the tank's legs
open, and keep the clock a clock — it is on the tower because a works needs the time, not because
a lesson needs a graph.

**Two towers stand in this era, and the water-and-clock tower carries the chain. `POL.5` was
re-dressed to make that true.** It used to read *"a combined water and clock tower, brick shaft,
iron tank stage, a clock face under the cornice"*, which is this building's three features in
this building's order — and this guide, which separates its two *stores* and its three *halls*
with real care, said nothing at all about its two *towers*. **The chain kept the tank stage, the
external stair and the clock**, because five sibling guides already name era seven's link in the
chain as *the open iron tank stage* and because the visible climb is the through-line itself.
`POL.5` is now **the hydraulic accumulator tower**, which the island section below already implies
somebody built — a lock with iron gates, a swing bridge and quayside cranes all need pressure from
somewhere. A blank square brick tower with a cast-iron weight case rising inside its head, a
lifting gantry across the top and pipes running out at its foot. **Solid
against open is the separation**, the same axis era eight will use for its pylon and its cooling
tower — no stair on the outside, no stage you can see through, nothing above the parapet but the
gantry — with scale behind it, since the accumulator is stouter and stops well short of the tank
stage.

**Landmark (`town-hall`) — the engine house.** *Through-line: a sheltered communal fire.* The wide
plot. A tall single-room brick shed with round-headed windows and a heavy stone-capped gable,
housing **a boiler and a beam engine**, with **a free-standing chimney** rising beside it. **Second
only to the tower**, and the chimney carries nearly all of that height on its own.

**Chain flag: the fire becomes a boiler and the smoke becomes a chimney.** Era one gathered round
it, era four institutionalised it, era five took it indoors under a louvre, era six gathered its
smoke into stacks — and here **the fire is enclosed in iron and the smoke is given a structure of
its own**, taller and thinner than any building on the island. The chimney is what keeps the
through-line legible, so it must be unmistakably the tallest thing on its plot and always
smoking. The tower up the road edges it out on height and **the chimney wins the eye anyway**,
because smoke draws it and nobody climbs a chimney. It becomes a heating plant behind a
civic frontage showing only its plume, then a data hall whose fire is invisible and whose rooftop
chillers are its only trace, and a lit plant stack exhaling steam through gratings people still
gather at. **The fire never goes out; it only becomes harder to see.**

---

## The island (D-ERA26)

The era that **engineers** the island rather than composing it. The Renaissance promenade
survives in fragments and everything else is subordinated to moving goods.

**The step from era six, and it is the most violent advance in the run.** Era six's floor was
clean, pale, composed about a centre, and laid out of hand-cut pieces no two of which matched.
**Era seven's is dark, made of identical machine-pressed units, and organised entirely by where
things have to be dragged.** Three things change at once and each is a different kind of change:
the ground **darkens**, the ground **gains a track**, and the ground's units become **identical**.
A player advancing out of era six should feel the light go out of the island.

**The signature move applies to the ground and explains the sett.** §1 makes this era *the
standard part, repeated without limit*: era six achieved an exact pattern out of inexact pieces,
and era seven achieves a coarse pattern out of **perfectly identical** ones. **The sett is a
machine-made unit and the ground is now a rhythm rather than a composition** — it has no centre,
no figure and no edge, and it simply stops where the site does, exactly as a mill elevation does.

**Ground.** Hard, dark and functional, in three surfaces:

- **Setts and engineering brick** where carts and rails run, laid in courses to a strict module,
  every unit the same size — and **cambered and channelled** for drainage rather than for looks.
- **Iron rails let into the paving**, flush with it, with **turntables at the junctions** and
  check rails at the curves. **This is the era's single most identifying ground feature**: no
  earlier island has a line of metal set into its floor, and no later one has it either — era
  eight lifts them. Run them so the eye follows a route across the whole island rather than
  laying isolated fragments.
- **Cinder, ash and clinker, rolled flat**, everywhere else. **Ground made of what the furnaces
  threw away** — the era paves with its own waste, which is the cheapest one-line statement of
  what it is.

**Everything is soot-darkened, and the darkening is UNEVEN and DIRECTIONAL — heaviest downwind
of the chimneys.** That unevenness is not texture, it is the ground's whole tonal structure and
the thing keeping this island legible; see the contrast note below.

**The Renaissance patterned slabs survive in one or two protected corners**, worn and grimy,
which is worth keeping as the era's one grace note. **This section names them, which is what
makes them an authored survival rather than stratified ground** (D-ERA33).

**Shoreline.** **Wholly engineered.** Vertical dressed-stone and brick **dock walls** dropping
straight into the water, with iron ladders, tie rods and rubbing strips. The gentle curve of the
Renaissance embankment is replaced by **straight runs and right angles**. A **lock** with iron
gates controls a basin cut back into the island — **the first time the water has been let
*inside* the shoreline rather than kept outside it**, and the biggest single change to the
island's plan since the Bronze Age quay. Nothing shelves anywhere; every edge is a face.

**Vegetation.** Nearly absent, and that absence should read as deliberate rather than as an
unfinished asset. **Soot-blackened survivors:** a few plane trees that tolerate it, thin grass on
the embankment slopes, buddleia and weed colonising brickwork and the backs of walls. **One
enclosed, cared-for square of planting survives as a public garden, fenced in iron, which makes
the surrounding bareness legible** — and it is doing real work rather than being a grace note,
because an island with no green at all reads as unfinished where an island with one green square
reads as stripped.

**Where boats land.** **Docks, not landings.** Enclosed basins with quayside cranes on rails,
warehouses with loading doors straight onto the water, coal staithes with tipping chutes, and
barges rafted up. Steam cranes, capstans, bollards, chain. A swing bridge across the lock mouth.

**Water.** **Dark, still and industrial.** Oily sheen, floating debris, a scum line on the dock
walls. The lock basin water is dead flat. The clean pale shallows of era one are unreachable now
even as a memory — worth stating, because this is the low point of the water's whole arc, and
later eras will clean it up rather than return it.

**Signs of habitation at the margins.** Coal heaps and timber stacks. Ash and slag tips. Iron
railings everywhere. Gas lamps on standards. Barrels, crates, chain, rope. **An enamel plate
screwed to a wall, white on dark, carrying a number rather than a name.** And **puddles that hold
the sky because everything around them is black** — which is not a detail, see below.

**Against the roads (D-ERA30).** **This is the era where the ground and the road come closest to
being one decision, and the resolution is the rail.** The setts are the road, and D-ERA30 owns
them; the island owns the **clinker and ash** between and the soot over everything. The relation:
era seven's road is the **only hard, laid, regular surface on the island**, so it reads as a
*harder and slightly paler band* running through a soft dark waste — the exact inversion of era
one's sunken darker tread, and the second time the relation flips in the run. **The rails belong
to the road tile and not to the ground**, because they run where the road runs; whoever writes
era seven's surfacing row should carry *sett course + rail course* and this section should not be
read as authoring a second set of them.

**What the era's own absent list rules out of the ground, and one of these is the trap.** §2
withholds **reinforced concrete and the cantilever**, **aluminium and plate glass**, the
**unitised curtain wall and composite cladding**, and **emissive surface — anything that glows of
its own accord**.

- **NO EMISSIVE SURFACE, AND THIS IS THE TRAP.** *"Light here comes from a flame in a lamp."* A
  wet, black, puddled ground under gas lamps is **exactly** where an artist reaches for a warm
  glow pooling on the setts, a lit reflection in a puddle, or a haloed lamp — and era seven may
  have none of it. The lamp is an **object** with a flame inside it; it lights nothing, casts
  nothing, and stains no ground. **The puddles hold the SKY, which is why they are authored that
  way** — a pale sky reflection is a value relief that costs the era nothing, where a lamp glow
  would spend era ten's entire signature seven eras early.
- **No reinforced concrete**, so **no poured slab, no concrete kerb and no concrete dock coping.**
  The dock walls are stone and brick, the kerbs are stone, and anything spanning is carried on a
  bracket or a column you can see. Era eight is where the ground gets poured.
- **No plate glass or aluminium**, so nothing at ground level is a large clear pane or a bright
  thin trim.
- **Iron IS this era's, and it should be everywhere at ground level** — rails, gratings over the
  channels, ladders, railings, tie plates, manhole covers. It is the first era that can have any
  of these and it should not be shy.

**Contrast against the buildings — THIS IS THE WORST CASE IN THE RUN AND IT NEEDS MANAGING.**
Body hue **soot-darkened brick `#8E5F4E`**, accent **cast iron `#3E4247`**, standing on setts,
clinker and ash that are **soot-darkened by the same soot**. **Dark buildings on dark ground made
dark by the same cause** is the one configuration that can lose a silhouette outright, and §0
constraint 7 requires silhouette-first legibility at full zoom-out.

**Four things resolve it, and three are already authored above:**

1. **The soot is UNEVEN AND DIRECTIONAL.** Heaviest downwind of the chimneys, lighter upwind and
   under shelter. That gradient is the era's tonal structure, and it means the ground is not one
   value — a building stands on a patch of ground that is not the same darkness as the building.
   **If the soot is applied evenly, this island dies.**
2. **The setts stay a clear step LIGHTER than the brick where they are protected.** Fired
   engineering brick underfoot and fired brick in a wall are the same material, so this is a
   deliberate authored separation rather than an observed one.
3. **The puddles are load-bearing.** *Puddles that hold the sky because everything around them is
   black* is the only bright value on the island and it is what keeps the ground from reading as
   a hole. Author enough of them, in the ruts and channels, and keep them pale rather than warm.
4. **The one green square, and the pale-era buildings still standing.** Era four's limestone, era
   five's lime-wash and era six's stucco are all on this island permanently, and **on era seven's
   ground they become the brightest objects on it.** That is a gift rather than a problem: the
   pale group that was hard to separate in era six separates trivially here. **The pale eras and
   the dark eras solve each other's problem, and era seven is where that first becomes visible.**

**Not measured here.** A separate pass is measuring all ten body hues against each other for
exactly this question; this section states era seven's ground constraint and does not pre-empt
its numbers. **What it should be told is that era seven is the case to check first.**

**The read:** an island turned into machinery. The land is a working surface and the water is a
resource, and neither is being looked at.

---

## The era's palette (PROPOSED — D-ERA27)

**Status: PROPOSED for Evan's review — not decided.** Per **D-ERA27** hue is an **era** property
rather than a domain one, so this era owns a palette. Derived from the material language this guide
already carries (the **Materials** line under *To author*), kept low-saturation, and sitting on
§1.1's calm parchment base — `#ECE4D3` ground, `#D9CCB2` deep ground, `#8FA9B8` slate-mist water —
rather than competing with it.

| Role | Proposal | Hex |
| --- | --- | --- |
| **Body hue** | Soot-darkened brick | `#8E5F4E` |
| Accent | Cast iron | `#3E4247` |

**Why this hue.** Brick, cast and wrought iron, glass in quantity, slate. **This is the era fired
clay finally becomes the body of everything, and the era it arrives already dirty.** Era two makes
the first fired clay in the run and holds it to objects — its §2 says *"never a whole wall"* — and
five eras later the same material is the wall, every wall, **identical to one size because a machine
made it**, which is §2's own point: *"The uniformity is the point."* The soot is what the uniformity
costs, and it is the cheapest possible way to make that cost legible without a new subject. The
near-black iron accent is structural and should be thin: columns, glazing bars, railings, roof
trusses.

> **⚑ RATIONALE PROSE REWRITTEN 2026-07-30. The value `#8E5F4E` is UNCHANGED and is not this
> rewrite's to move.** This read, verbatim:
>
> > This is era two's fired brick **returned darkened** — the same material, a century of smoke on
> > it, which is the cheapest possible way to make the era's cost legible without a new subject.
>
> **It made this era's body hue a colour callback to era two specifically, and era two has stopped
> being that colour.** Evan has asked for era two's buildings to be redesigned onto a different
> palette; its proposal is a pale straw-buff, **`#D9C288`**
> (`../era-02-neolithic/style-guide.md`, PROPOSED 2026-07-30, not decided). A body derived from era
> two's *"returned darkened"* cannot survive era two going pale.
>
> **The reference was already broken before that, which is what makes this cheap rather than a
> loss.** Era two has **no fired brick**: its §2 gives the body to the **sun-dried** brick and
> confines fired clay to components, and the 2026-07-29 rename moved that hue's label from *fired
> brick* to *mud brick* for exactly that reason while leaving the value alone. So from that date this
> sentence has pointed at a material era two does not have.
>
> **What this era loses, stated plainly: the COLOUR derivation.** Its body hue no longer has a
> two-era pedigree and now stands on its own material. **What it keeps is the MATERIAL lineage, and
> that one is true and already authored at both ends** — fired clay is era two's signature held to
> objects, and era seven is where it becomes the body of the city. **The rewritten paragraph is the
> stronger argument anyway**, because it rests on this guide's own §2 (*"Machine-made brick,
> soot-darkened … The uniformity is the point"*) rather than on a neighbour's hue. What is genuinely
> gone is the tidiness of one era's colour being another's, aged.
>
> **If Evan takes era two's recorded alternative instead** — the fired-brick family at `#A2503A` —
> the old callback becomes true for the first time, and at **ΔE 18.60** from this body it would be a
> visibly close one. That is a reason to re-read this paragraph if the alternative is chosen, not a
> reason to keep a sentence that is false today.

**One body hue per era.** Within the era, buildings **share the body hue and differ by silhouette
plus accent**, never by a second body colour. That is the one rule that survives `City_Art_Bible.md`
§1.2's retirement, now applied per era instead of per district.

**`#FFB703` is not available**, here or in any era: it is the mastery accent carried on the stars
above a topped-out building, never a material.

---

## 6. The three construction stages

All thirty-eight buildings get three models each. The stage names are fixed in code
(`buildingAssets.ts:41`), and the era's job is to make the sequence read as *this era's* way of
building — which here means the building stands complete and empty before any of it is walled.

| Stage | Engine states | Industrial read |
| --- | --- | --- |
| **`site`** | `not_started`, `preview` | A **hoarded** plot for the first time in the run: a timber boarding round the whole of it with a gate in one side. Inside, cast-iron column base plates bedded and levelled on brick pads, and brick and slate stacked **on pallets** rather than heaped. Everything inside the hoarding is ankle-height at most |
| **`construction`** | `teaching`, `practice` | A **steam crane running on rails** laid across the site, and **the iron frame bolted up complete and empty before any wall arrives** — columns, beams and roof trusses standing as a skeleton with daylight straight through it, brick starting at one end only |
| **`built`** | `unfinished`, `complete`, full mastery | The finished building as described in §5 and in the roster. `advanced` (mastery ≥ 2) and full mastery both reuse this model — there is no separate gilded version, and mastery rides above it as stars (`buildingAssets.ts:28-31`) |

**The empty frame is the image no earlier era can produce, and it is the whole era in one
picture.** Every building before this one had to be built from the ground up in the order it
carried its loads, so a half-built masonry building is a half-height building. Here the full
outline exists first and the walls arrive afterwards as infill, which means the construction stage
shows **the finished silhouette at full height with nothing in it** — the most legible
construction state in the run, and the clearest possible signal that the wall has stopped being
structural.

**The hoarding and the pallet are the dating devices.** A fenced site says the work has become
somebody's property and a stack on a pallet says the materials arrived in identical loads; both are
small, both read from above, and neither is available to any earlier era. Era one drove stakes, era
five scribed a plaster floor, era six stood a model on the grass — and here the site is closed,
labelled and delivered to.

---

## 7. Props kit

§12 budgets a per-era props kit alongside the six masses, so that 62 buildings can be covered by
six types plus props. This era's kit:

- **The tally descendant**: a **printed ledger** ruled in columns, open on a desk or a counter,
  and closed in a stack; and the **enamel plate**, white on dark, screwed to brickwork and
  carrying a number rather than a name.
- **Lifting**: a **hoist gantry** projecting over a loading door, a **steam crane on rails** with
  its boiler and jib, a wall crane on a bracket, a chain block hanging from a beam.
- **Fuel and material stacks**: coal in a squared heap with a shovel in it, timber stacked and
  stickered, pallets of brick, slate on edge in bundles, an ash tip.
- **Iron in the street**: railings in runs and returns, bollards, a chain looped between them, a
  cast-iron gutter grating, a manhole cover.
- **Light and time**: **gas lamps on standards** at two heights, a wall-bracket lamp, a lit window
  at ground level — and nothing that glows without a flame in it.
- **Transport ground**: rails let into setts, a **turntable**, a **weighbridge** with its plate
  flush in the paving and a small hut beside it, crates and barrels **on pallets**, a loaded
  flat wagon.
- **Signage, such as it is**: the **enamel plate** by every door, a painted brick gable with a
  faded trade name, and a cast-iron plate on a column with a pattern number on it. This is how a
  building gets identified in-world without a written name, and it is the first era where the
  identifier is **issued** rather than made — the same plate on forty buildings, differing only
  in its number.

---

## The subtitle row (D-ERA29)

One proper-noun dressing per mass, ratified for wiring into `apps/web/src/city/eraDressing.ts`.
The subtitle **enters the accessible name**, so these are capitalised proper nouns rather than
the running prose of §5.

| Mass | Stable name | **Industrial subtitle** |
| --- | --- | --- |
| `hall` | Assembly Hall | **the Spinning Mill** (`FUN.1`) / **the Exhibition Hall** (`FUN.7`) |
| `store` | Store | **the Cotton Warehouse** |
| `dwelling` | Dwellings | **the Brick Terrace** |
| `workshop` | Workshop | **the Locomotive Shop** (`FUN.3`) / **the Cannon Factory** (`FUN.8`) |
| `yard` | Commons | **the Coal Yard** |
| `tower` | Tower | **the Water Tower** |
| `town-hall` (hub) | Civic Center | **the Engine House** |

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

**The through-line: a works with a town attached, and every building is a named shop inside the
enterprise.** That read is unchanged from the row's first draft; what changed is that the names now
say **which** shop, because *machine*, *goods* and *works* were doing no more work than the mass
words underneath them.

- **the Spinning Mill** (`FUN.1`) and **the Exhibition Hall** (`FUN.7`) for the Machine Hall. Two
  nodes share `hall` here and one name could not carry both. `FUN.1` has *line shafting overhead on
  regular bays*, which is a spinning mill and nothing else — line shafting is the defining machine
  of the era and it disappears with it. `FUN.7` is one glazed span on iron trusses under a monitor
  roof, which is the Victorian exhibition hall, the building the era invented to look at itself in.
- **the Cotton Warehouse** for the Goods Shed. *Goods* is the weak adjective the lead named.
  `FUN.2` is brick bays with iron shutters and a hoist gantry over the street elevation — a cotton
  warehouse exactly, and cotton is what this era's town is for.
- **the Locomotive Shop** (`FUN.3`) and **the Cannon Factory** (`FUN.8`) for the Fitting Shop. Two
  nodes share `workshop`. `FUN.3` has a travelling crane on gantry rails and full-height doors at
  the gable end — that is a locomotive shop, and it is where the crane is *for*. `FUN.8` is
  **re-authored as the cannon factory**, era seven's entry in the defence lineage, so the cell names
  the building the roster and §5 now author: a gun foundry with a sunken casting pit under a ridge
  lantern and a glazed boring range down one flank.

  > **THE CELL HELD *the Pattern Shop* AND A PENDING *the Machine Factory* IS SUPERSEDED.** This
  > bullet used to end *"`FUN.8` is the roster's own pattern shop, timber-racked over brick, and a
  > pattern shop is where the wooden patterns for iron castings are made, which only exists while
  > things are cast."* **That reasoning was sound and it is retired with the building**, not
  > overruled: a pattern shop really is era-locked, and the guide is not claiming otherwise. What
  > changed is that the node is no longer a pattern shop. `output/imagegen/era-07-industrial-building-briefs/README.md`
  > had refused *the Machine Factory* as a form mismatch — correctly, and on the recorded ground that
  > *machine* is this era's most general word rather than an era-locked one — and **the lead closed
  > the flag by re-authoring the form**, which was one of the three routes that brief named.
  >
  > **`Cannon Factory` passes the test the brief applied to `Machine Factory`, and it is worth saying
  > why rather than asserting it.** The objection to *Machine* was that the qualifier was the era's
  > most general word: §2 has machine-made brick, §1 has the machine that repeats a standard part, and
  > the lesson framings lead with *the machine hall*. **`Cannon` is the opposite of general** — it
  > appears nowhere else in this era — and it names a specific product rather than a category of
  > work. The brief's secondary point that *Factory* was rejected once for era ten's `workshop` still
  > stands as a fact and does not carry here for the same reason: era ten's rejected cell was *the
  > Factory* bare, with no qualifier at all.
  >
  > **Era six's `RAT.5` is the Cannon Tower, one era earlier, and that is accepted.** Two *Cannon*
  > names in adjacent eras was put to the lead and approved. They share no head noun and no
  > qualifier beyond the word itself, which is the *repeated head noun is not the defect* test met on
  > its own terms: a gun platform and a works that casts guns.
- **the Coal Yard** for the Works Yard. *Works* restates the enterprise rather than naming the
  ground; §5's squared heaps of coal and timber under a soot-black plane tree are a coal yard.
  Inert: no node on `yard` here.
- **the Brick Terrace** for the Brick Houses, which collided with the civic **Workers' Houses** in
  this same era. *Terrace* was removed from this row once for meaning a patio outside Britain; that
  is reversed, because **Brick Terrace** is now the only *Terrace* on this side of the run and the
  civic name it had to be told apart from is the one that says *Houses*. Inert here: no node on
  `dwelling` in this era. *(The mass id was added 2026-07-29, in the sweep that marked era six's
  `tower`. The two words were already correct and are kept, because three merged briefs quote this
  cell as "Inert here" verbatim; what they could not tell a reader is WHICH mass, where every other
  guide in the folder names it.)*
- **the Engine House** for the Public Hall, which the lead named. *Public* is a weak adjective on a
  bare function word, and §5 already authors this landmark as **the engine house** — a boiler house
  behind a civic frontage, carrying the *sheltered communal fire* through-line as a chimney. The
  hub now says what §5 draws.

**Kept:** the Water Tower, which the lead named.

---

## The advisor (D-ERA28)

**Oru, dressed and speaking as a works engineer.** The learner's companion for the whole Industrial
era, carrying the mini-lesson, the check-your-understanding prompt and the hint exactly as he does
in era one — because he *is* era one's advisor, in this era's clothes and this era's voice.

**Who she is — THE REGISTER, which is per-era and is meant to be.** The engineer who keeps the line
shafting turning and signs off a part before it is repeated ten thousand times — who thinks in
**standard parts and what they do**, which is this era's signature move and is also what a function
is. Not an owner and not a foreman: the read is
*the person who understands the machine*, and she teaches by showing the mechanism rather than
the result. Like every advisor in the run, she stands beside the learner's work.

**What she is wearing — THE DRESSING, out of this era's four materials and nothing else.** A dark
serge work jacket over a high-necked blouse, sleeves buttoned back, and a plain skirt over sturdy
boots. Cotton drill apron with a long pocket down the front holding a **folding rule** and calipers.
A
**brass**-cased pocket watch on a chain, which is the era's one bright metal and the era's own
obsession. She carries a **ruled ledger** under one arm — §1's tally descendant, the printed
ledger, in columns and bound — and it is her counterpart to Oru's staff. **Soot** at the cuff and
hem, because §2 makes soot a finish and a character who works here would carry it. No jewellery.

### The four poses

The same four names as era one. An advance may **shrink** the pose vocabulary (D-ERA28) and every
consumer maps its beat through a total typed table, so keeping the four cannot break a consumer.

| Pose | The read | Where it is used |
| --- | --- | --- |
| **`idle`** | At rest. Ledger closed against the hip, watch chain still | The resting state; no lesson beat requests it directly |
| **`talk`** | Speaking. The ledger open on her forearm, one finger down a column | Every teaching line |
| **`point`** | Pointing at the work with the folded rule | A correct answer, a hint, a retry |
| **`squint`** | Reading a figure close, head down over the page | Reading the learner's work; authored and available |

**No celebration pose**, following era one; the congratulation is carried by the reward chip and
the mastery star.

### Palette

The works-engineer dressing sits inside the era palette: serge in the era's darkest note, apron in
the unbleached cotton that reads against the machine-made brick body hue, brass at the watch, soot
greying the whole lower half of the figure. Skin and hair are the only notes outside it.

> ## ⚑ THE NAME IS SUNSET — 2026-07-30, under `D-ET9`. THE DRESSING AND THE REGISTER ARE NOT
>
> **THE RULING (the team lead, recorded at `../../2026-07-29-era-trial-contract.md` §19.2),
> verbatim:** *"There is one continuous advisor for the whole run, re-themed per era. Not ten
> advisors."* This section was authored in good faith under the half of **D-ERA28** that has since
> been superseded — *"one advisor per era, belonging to that era"* — and it named era seven's
> advisor **Ada Merrick, a works engineer**. **The name `Ada Merrick` is retired.** Era seven's
> advisor is **Oru**, dressed and speaking as a works engineer.
>
> **EVERYTHING ELSE HERE SURVIVES, and the lead said so in terms:** *"the advisor's prose should
> change across eras though — it's not just a static advisor."* What is continuous is the name and
> the relationship with the learner; **the appearance and the voice are per-era and are meant to
> be.** So the serge work jacket, the cotton drill apron, the brass pocket watch, the ruled ledger
> and the soot at the cuff, the four poses and this palette placement all stand exactly as authored
> — and so does the register above, *the person who understands the machine, who teaches by showing
> the mechanism rather than the result*, which is this era's presentation of Oru rather than a
> second person's personality.
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

1. **The framing comes from the era's WORLD, not the node's BUILDING** (D-ERA8). The erecting
   shop hosts FUN.3; it is not a picture of a piecewise function.
2. **§2's "Explicitly absent" list is a hard boundary.** No reinforced concrete, no cantilever,
   no aluminium, no plate glass, no curtain wall, and **nothing that glows of its own accord** —
   light here comes from a flame in a lamp.
3. **Theming follows the ERA, not the domain.** This era holds five Functions nodes **and
   `POL.5`** from Polynomials. `POL.5` is framed Industrial like the rest of the chapter, not
   Classical with its domain.

**The era's context palette — six reusable settings, from this guide's own props:** the **machine
hall** with its line shafting on regular bays; the **standard part** repeated without limit; the
**ruled ledger** and its columns; the **erecting shop** with its travelling crane; the **goods
shed** and the wagons it loads; and the **accumulator tower** with its rising weight case.

**This is the era where "a machine is input to output" stops being a metaphor**, which the era
design gives as the reason functions sit here. Lean on it: a machine that takes a blank and
returns a finished part *is* a function, running it backwards *is* an inverse, and two machines
in series *is* composition. What an author must still avoid is letting the **building** be the
machine — the framing is the work going on inside, not the shape of the shed.

| Node | The mathematics | Industrial framings (2 to 3 per node) |
| --- | --- | --- |
| **FUN.1** — function notation; evaluate; vertical-line test | one input, one output | (1) **A machine on the line** takes a blank of a given size and returns exactly one finished part — feed it the same blank twice and you get the same part, which is what makes it a machine worth having. (2) **A works ledger keyed by part number**: look up the number, read off the one value beside it. (3) **A machine that returns two different parts from one setting is broken**, and that is the vertical-line test as a shop-floor complaint rather than a rule. |
| **FUN.2** — domain and range | what it accepts, what it can emit | (1) **The stock a machine will take** — bar between two diameters, nothing outside — and the sizes it can turn out. (2) **A hoist's rated load and its lift height**, which bound the input and the output separately. (3) **A gauge that only reads over part of its scale**, so a question outside that band has no answer rather than a wrong one. |
| **FUN.3** — piecewise-defined functions; graphing them | a different rule per range | (1) **A freight rate that changes at a break point** — one price per ton up to a wagonload, another beyond it. (2) **A machine with gear settings**, each covering its own range of speeds, with a real changeover between them. (3) **Shift pay** at one rate to the end of the day and another after, which is one function with two pieces and a visible corner. |
| **FUN.7** — compose and decompose functions | machines in series | (1) **Two machines in a line**: the second takes what the first hands it, and the pair together is a third machine with its own input and output. (2) **Reading a works process backwards** to find which two stages produced a given part, which is decomposition. (3) **A conversion done twice** — gauge to inches, inches to a price — where the order matters. |
| **FUN.8** — one-to-one; inverse functions | running the machine backwards | (1) **A mould and its casting**: the foundry cuts the shape that produces the part, so mould and part are inverse operations on each other — *(this read "a pattern and its casting … the pattern shop makes the shape" until `FUN.8` was re-authored; a foundry moulds from a pattern too, so the framing survives the form change with one noun changed).* (2) **A machine you can run backwards** only if no two blanks ever produced the same part — which is one-to-one, stated as a workshop condition. (3) **A conversion table read from either column**, and what goes wrong when two rows share a value. |
| **POL.5** — graph quadratics: vertex, intercepts, min/max | the parabola and its turning point | (1) **The accumulator tower's weight case:** it is raised and it falls, and the height against time is the era's own parabola, in a building the era actually built. (2) **A cost curve with a cheapest run length** — too few and the setup dominates, too many and waste does; the vertex is the works' actual decision. (3) **A jet of water from a pipe at the works yard**, arcing and landing, where the intercepts are the pipe and the ground. |

**One thing to keep off the list, and it is now MORE binding rather than less.** Do not frame a
quadratic as a shell trajectory or any other weapon — and this survives `FUN.8` becoming the **cannon
factory** untouched, because a building the learner looks at and a sentence the learner is asked to
reason inside are different surfaces. **The lead has ruled the building in; nothing has ruled the
framing in**, and the temptation is obviously sharper now that the era holds a gun foundry, which is
why the rule is restated here rather than quietly carried.

> **ONE CITATION CORRECTED, because it was claiming more than it had.** This paragraph cited
> *"`Game_Visual_Design_Brief.md` §2's tone bans"* as the authority. **§2's explicit ban list is about
> manipulative free-to-play mechanics** — urgency timers framed as pass/fail, streak-loss guilt,
> artificial scarcity, loot-box loops, energy gates, notification pressure, real-money purchases —
> and **it says nothing about weapons at all**. What §2 does supply is the tone requirement the rule
> genuinely rests on: *calm and non-punishing*, *warm and constructive, like a cozy diorama you are
> tending*, for a **math-anxious** primary persona. **So the rule stands on the tone clause and not on
> the ban list**, which is a weaker citation and a sufficient one. Stated accurately it also reaches
> the art: §5's cannon factory is authored to manufacture and never to fight, for this reason.

---

## What is authored, and what this guide does not decide

Per §12. Footprints are identical in every era (INV-ERA-1) — see
`../era-01-prehistoric/style-guide.md` §6 for the table, and its §0 for the nine hard
constraints every era inherits.

- [x] **Materials** — §2. Machine-made brick gone soot-dark, cast and wrought iron, sheet glass in
  quantity and slate, with timber demoted to boarding nobody sees.
- [x] **Structural language** — §3. The regular bay, the iron frame, the long span with its ridge
  lantern, and the chimney as a structure in its own right.
- [x] **Roof and support forms** — §3. The sawtooth north light, the glazed span on iron trusses,
  slate where there is no glass, and the segmental brick arch over openings.
- [x] **Palette** — proposed above (D-ERA27), awaiting Evan's review: soot-darkened brick with a
  cast-iron accent, which is how this era darkens the calm base.
- [x] **Level of ornament** — §4. Low, and all of it in the repetition, with the spend going on
  the eaves profile and the rhythm of the openings.
- [x] **Visible technology** — §4 and §6. Steam, the chimney, line shafting, the gantry, the
  gasholder, rails and the turntable, the weighbridge and the gas lamp.
- [x] **The era's signature move** — §1. The standard part repeated without limit, with era six's
  engraved plate becoming the printed ledger and the enamel plate.
- [x] **The three construction stages** — §6.
- [x] **The props kit** — §7.

- [x] **The subtitle row** — ratified above, seven proper nouns, ready to wire.
- [x] **The advisor** — above: **Oru dressed and spoken as a works engineer**, with the four poses,
  the place in the palette and this era's register. *(Re-recorded 2026-07-30 under `D-ET9`, which
  retired the name `Ada Merrick`. Still complete: the dressing and the register are what this item
  was ever ticking off.)*
- [x] **Lesson framings** — above, all six nodes including `POL.5`, with the era's context palette.

**Closed on 2026-07-29, and how.**

- **Roads: rails LET INTO a single sett surface, and this is a rule for all four late eras rather
  than a preference for this one.** The combination that fails `depthPrecision.test.ts` is stacked
  coplanar surfaces on the largest island the game will ever show, and this era is the first to
  want three of them at once (sett, kerb, rail). **One surface, with the rail and the kerb read as
  material and profile changes within it rather than as separate slabs laid on top.** It keeps
  everything a viewer needs to read — a tram line is still obviously a tram line — and it removes
  the geometry that breaks. **Eras eight, nine and ten inherit this rule**, which is the reason to
  settle it here rather than three more times: the guide that first hits a constraint owns the
  answer for the chain.

  > **One correction to the REASON, which leaves the ruling standing (2026-07-29).** The guard is
  > no longer what forces this. **D-ERA30** (2026-07-28) made surfacing a per-era **ordered list of
  > courses**, and `apps/web/src/city/three/Roads.tsx` derives **each course's depth rung from its
  > index** on the island's own uniform 0.05u ladder — never from an authored height — with
  > `three/depthPrecision.test.ts` asserting separability at the furthest view **for every era whose
  > surfacing has more than one course**. So stacked courses are safe by construction now, and the
  > sentence *"the combination that fails `depthPrecision.test.ts`"* describes the **old hardcoded
  > three-slab road** rather than anything an era could author today.
  >
  > **The ruling above is kept anyway, and now rests on looks rather than on the guard:** a rail let
  > into setts reads as a rail because the eye picks up the line and not the height, and one surface
  > is the cheaper thing to model ten times. **What changes is what a later era must argue.** An era
  > wanting a genuine second course does not have to overturn a depth constraint; it has to make a
  > case that the layered read is worth the extra course. **Three prohibitions do survive**, and they
  > are the whole of what is left: no authored height, no course landing between two rungs, and no
  > course `kind` that nobody has drawn — the last is a compile error, which is the design working.
- **The workshop's covered forecourt is adopted, and it belongs to the chain's fitting shop
  ONLY.** The sawtooth roof closes the open floor completely, so this era genuinely breaks the
  through-line, and the forecourt is how it keeps a reading of it. The guide's own scoping is
  right and is now the decision: the **erecting shop gets a loading apron**, the **cannon factory a
  sunken casting pit behind one wide arched opening**, and only the chain instance gets the
  forecourt, because a device shared by all three instances stops distinguishing them. *(This item
  read "the **pattern shop a hoist door**" until the consolidated pass re-authored `FUN.8`; the
  hoist door is one of the three separators that form change spent, and the banner under the roster
  table records the trade.)* Era four's rule stands behind this — the workshop
  mass keeps at least one side open to the air in every era that can manage it — and this era can
  only manage it in front.
- **Footprints for the six new nodes are decided**, since INV-ERA-1 fixes them forever and two
  masses carry two roster dressings each. **FUN.2 (store) and FUN.3 (workshop) take the long
  plot; FUN.1 (hall), FUN.7 (hall), FUN.8 (workshop) and POL.5 (tower) take the square full
  plot.** That is what separates both shared-mass pairs by plan rather than by props alone: the
  erecting shop is one tall bay with a crane running down its **length**, against the compact square
  block beside it, and FUN.3's long plot renders exactly that. The accumulator tower stays square for
  the reason era one measured.

  > **`FUN.8`'s plot did not move when its form did, and the argument survives.** This item read
  > *"against the pattern shop's compact two-storey block"*. The two-storey block is gone — the
  > cannon factory is one tall volume — but **the plot's job is unchanged and is now doing more of
  > the work**, because it is one of only three separators left: a square casting house against a
  > long crane bay is a plan difference at any zoom. INV-ERA-1 froze the cells when this block closed
  > on 2026-07-29, so a form change is authored inside the plot it inherits either way.

---

## Related

- `civic-buildings.md` — the bought buildings for this era, and the food, livability and happiness
  values this file deliberately does not carry. **Two of its four rows changed name and one changed
  building:** the **food** row is now **The Food Works** *(the same cold store, renamed onto the row
  that actually holds the food)* and the **happiness** row is now **The Railroad Station**, on the
  reasoning that easier travel is the amenity. **Era seven therefore no longer has a bathing
  building** — the happiness row was the baths-and-wash-house, and that building is gone from the era
  rather than renamed. Recorded here because it changes what era seven offers a player, and nothing
  in this file's skill roster would show it.
- `../README.md` — the ten eras, the two-file convention, and what each guide owes.
- `../era-01-prehistoric/style-guide.md` — §0's nine hard constraints, §6's frozen footprints and
  the seven through-lines this guide inherits, including the tally prediction this era's ledger
  and enamel plate fulfil.
- `../../2026-07-27-era-progression-design.md` — §3 the ten eras, §5.1 the land, road and depth
  constraints this era runs into, §6.1 the six ordinary types, §12 the art budget and D-ERA20/21.
- `../../City_Art_Bible.md` — the palette, the three-tone lighting model, the silhouette system
  and the accessibility rules this guide sits inside.
- `../../../../Game_Visual_Design_Brief.md` — the tone bans (no scarcity, no guilt framing), which
  this era's smoke and soot have to stay inside.
- `../../../../Node_Spine_v4.md` — the lesson titles quoted verbatim in the roster.

---

## Image inspiration

Drop reference images straight into this folder. Worth gathering: brick mills with regular
bays, sawtooth factory roofing, iron and glass train sheds, chimneys, gasholders, viaducts,
canal locks, and terraced worker housing.
