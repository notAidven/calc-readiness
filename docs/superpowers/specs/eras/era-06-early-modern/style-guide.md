# Era 6 — Early Modern: style guide (skill buildings)

**Status: PROPOSED.** The era's visual language is authored below — materials, structural
language, ornament, the seven masses and their shape language, the three construction stages and the props
kit. **Nothing in this guide is open**, as of 2026-07-29. The collision it had to settle is the
hall, where era one's prediction and this era's own roster both wanted a domed hall; the chain keeps
the round plan and is the *domed rotunda*, `GEO.1` keeps the square one.

**Scope: the SKILL buildings.** The bought buildings are in `civic-buildings.md`.

> ## ⚑ 2026-08-02 — EARLY MODERN NAME AND THREE.JS PRODUCTION BUDGET
>
> **The learner- and author-facing name is now Early Modern.** The stable runtime id remains
> **`renaissance`** everywhere persistence, APIs, routes and saved state address the era; this is
> a display-name and authoring-path change, not a migration.
>
> **The canonical modelling brief is
> `output/imagegen/era-06-early-modern-building-briefs/`.** Its eleven images and JSONL prompts
> are the refined architecture references. Preserve their silhouettes, proportions, physical
> corrections and medium-rich material detail. Runtime geometry must remain Three.js-feasible:
> build the main masses from boxes, extruded polygons, cylinders and roof prisms, and express
> repeated trim with shared or instanced geometry rather than unique micro-meshes.
>
> Period discussion below may still correctly say *Renaissance* when it names the historical
> architecture. Early Modern remains distinct through large geometry — enclosed warm-buff
> plaster masonry, localized hand-made brick, pale dressed-stone trim, dark slate/lead roofs and
> one strong gable, oriel, cupola, dome or tower where named — not through ornament density.

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
>   where before a weak drawing was replaced at the next advance. **Two pairs share a mass — `GEO.1`/`POL.7` on `hall` and `CG.1`/`RAT.5` on `yard`** — so both pairs need separating by plan, scale or props, never by geometry (`../README.md`).
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

**Era id:** `renaissance` · **Domains:** **D6** Geometry after the renumber (**D10** today),
**`CG.1`** from Functions & Coordinate Geometry, **`POL.6` + `POL.7`** from Polynomials, and
**`RAT.5`** from Rational Expressions — four domains, the most of any era ·
**New nodes:** 6 · **Buildings standing by the end of this era:** 32 · **Era multiplier:** ×32 ·
**Owner: Anthony**, entire (`../../../Content_Authoring_Split.md` §10.4)

**Why this era, per `../../2026-07-27-era-progression-design.md` §3:** *Perspective, surveying,
domes.*

**Short historical clarification:** Early Modern here uses a simplified **Northern Renaissance**
urban silhouette — enclosed masonry blocks, dark lead roofs and strong gables — while retaining
the observatory dome and civic cupola as named landmarks.

---

## Notes before authoring

**This was the era the node curation existed to fix, and it has been fixed twice over.** D-ERA3
recorded the problem directly: the strict one-domain-per-era mapping gave a **2-lesson Renaissance
against an 11-lesson Industrial**, which is why an era is defined as *a curated node set sized for
pacing, not a domain*. **PR #180 settled it** — `CG.1` joined Geometry here for three nodes, and
the Industrial Era's eleven fell to six. **PR #210 then grew this era from three to six**, moving
`POL.6`, `POL.7` and `RAT.5` in behind the coordinate plane. All eras sit inside the authored 3-9
pacing band, and Early Modern is no longer the smallest chapter in the run — it is now joint
third largest.

**So this is the era with the most new material to design in this folder, not the least**, and
the roster section below is where that lands. A reader coming to this guide from the era design's
§3 table, or from an older reading of `../README.md`, will expect three nodes and find six.

**Its Geometry domain id moves under the renumber**, from D10 today to D6. **Node ids do not
change** (D-ERA4), so nothing in the item bank or the lessons moves — but anything keyed to the
domain id does.

**The pairing is the strongest thematic one in the whole sequence**, per §3's own note:
Renaissance perspective against Geometry. Worth spending the era's signature move on
perspective itself — surveying instruments, drawing frames, the dome as a solved geometry
problem rather than as decoration.

---

## 1. The era in one line, and its signature move

**One line:** the same town re-drawn to a measured drawing, in warm buff lime plaster with
localized red-brown brick and pale stone trim under dark slate and lead roofs.

**The signature move — the drawing made physical.** Every building in this era is **a drawing
built to a line**. The order is set out and counted before anything is cut: the pilaster
spacing is decided, the storey heights are in a fixed relation, the dome is sized to the drum
under it, and what stands on the ground is the drawing at full size with nothing improvised in
it. Where era five's oak frame recorded how a wall was held up, this era's applied order
records **a decision taken on paper**, which is why symmetry here is a system rather than a
preference: a face that matches itself across a centre line is the visible proof that the
building was resolved before it was begun.

The dome is the clearest case and the reason it belongs here rather than anywhere else. **It
arrives as a solved problem, not as decoration** — a hemisphere is the one roof whose shape is
entirely determined by the circle it stands on, so a builder who can set out the circle has
already set out the roof. Keep that legible: a drum with a clean cornice, the dome springing
straight off it, and no applied ornament competing with the curve.

**The tally descendant: the printed page and the engraved plate.** Notches on a post became a
chalked slate, and here the mark is **multiplied**. The same plan exists in twenty identical
copies, the same elevation is engraved on a plate and pulled as many times as anyone wants, and
for the first time a record is not a single object somebody keeps. That is the step the motif
takes in this era, and it matters for the buildings themselves: rolled and stacked printed
sheets, plates in a rack and a pinned-up engraved plan are what appears on walls and benches
where era five chalked a slate.

---

## 2. Materials

Five, and the relationship among the first four is the era.

| Material | Read | Notes for modelling |
| --- | --- | --- |
| **Pale dressed stone at bases, openings and structural corners** | The signature frame around the warmer wall: heavy base, calm trim above | Use `#D8CDB3` for rusticated plinths, quoins, lintels and sills. Model the base as a broad band and keep repeated blocks instanced |
| **Lime stucco and plaster** | The dominant body above the base. Flat, warm, faintly chalky | Keep it as an unbroken warm buff `#C7A48E` field. Never divide it by visible studwork or a repeated panel texture |
| **Hand-made muted red-brown brick** | A restrained secondary material that dates the Northern town without turning it Industrial | Use `#B1775A` only on gable edges, chimneys, bases or a selected secondary façade. It never becomes the dominant field and individual courses need not be modelled |
| **Dark slate and sheet lead** | **Every roof**, including the named dome, cupola or lantern | Treat `#596675` as the principal cool roof plane. Faceted dome bays and restrained slate courses may read, but there is no terracotta roof field |
| **Glass in wooden or leaded casements** | Windows large enough to read as openings | Use simple recessed rectangles with zero or one broad cross-mullion. Window count and spacing must read before pane detail |

**Terracotta roof tile does NOT continue from era four**, and this is the one material
decision in the guide that was reversed rather than authored. **Every roof in this era is
lead**, pitched roofs included, and the paragraph that used to stand here said the opposite.

> ## ⚑ REVERSED 2026-08-01 — this paragraph read *"Terracotta roof tile continues from era
> four unchanged, on everything that is not domed … the pitched roofs behind the domes should
> look inherited rather than newly chosen"*
>
> **It was the larger half of the era-four collision.** Era four's own guide says the terracotta
> roof *"is what actually separates a building from the ground"* — so this era had adopted a
> neighbouring era's identity device on the biggest surface it owns, and *called* it inherited,
> at a body hue that was 0.32 L\* from era four's. Both eras also stand on pale cool dressed
> stone. Three of the largest fields matched, and the fine separations this guide does carry —
> pilaster against round column, rustication grading, glazing bars — cannot outvote three
> fields. See the palette section for the measurement and the body hue that moved with it.
>
> **Nothing is lost, because lead was already here.** It is §2's third material and the era's
> declared accent, it is what a Renaissance dome and a palazzo roof were actually covered in,
> and promoting it costs the guide no new vocabulary. What it buys is that the whole roofscape
> flips from orange to cool grey-blue against a warm wall.
>
> **Terracotta survives in this era as an OBJECT and never as a SURFACE**, and that line is
> where the next reader should hold it. The Painters' School's spandrel roundels
> (`civic-buildings.md`) and the citrus pots in §7 stay terracotta: a medallion and a
> flowerpot are fired clay at the scale of a prop, so they read as small objects against buff
> plaster and slate rather than as the era's identity, and the 2026-07-30 roundel ruling was about
> legibility and is untouched by a colour decision. **No roof, no wall and no paving is
> terracotta.**

**Explicitly absent, because they are later eras' signature moves:** structural iron and
machine-made brick, both the Industrial era's announcement. Era six's localized brick is
hand-made and visibly subordinate, so nothing here is repeated because
a machine made it identical; **soot as a finish**, also Industrial, and the reason this era's
stucco stays clean even where it is old; reinforced concrete and the cantilever, which wait for
the Atomic Age, so everything that projects is carried on a bracket you can see; and the
unitised curtain wall, which waits for the Information Age.

> **AMENDED 2026-08-01 — *"structural iron"* above means *"iron doing a FRAME's job"*, and the
> hand-forged tie is admitted.** Unqualified, the phrase forbids the *catena* — the wrought iron
> tie-rod thrown across an arch springing or round the base of a drum — which is **standard
> Renaissance practice** and is holding up buildings this era draws. **The words in the list are
> left standing** because other passages in this guide and in the neighbouring ones quote them;
> what this note does is state the role they mean. **Era seven's release is iron CARRYING the
> building** — the column, the truss, the frame, repeated identically because a machine made it
> repeatable — and a tie is none of those, so a ban on the tie is wider than the release it is
> protecting by exactly the width of the tie.
>
> **This era has already written the correct rule further down the page, and this is that rule
> applied to the tie.** The island section (D-ERA26) admits a drain grate on the ground and scopes it by
> how it was made rather than by what it is made of: *"No iron grating that is a machine product.
> The drain grates above are hand-made — cast or wrought individually, small, and no two
> identical."* A tie passes that test exactly as the grate does. **The shape of the permission,
> so it cannot spread: hand-forged, in tension, small in section, and never a frame.** Anything
> repeated because it was made repeatable is still era seven's, and this era's own argument —
> *"nothing here is repeated because a machine made it identical"* — is untouched.
>
> **Nothing on any elevation changes.** A tie is a rod and a plate, or it is bedded in the
> masonry out of sight; where it shows at all it is the smallest visible member on the wall.
> `../era-05-medieval/style-guide.md`'s island section carries the matching amendment, since the
> two eras were too wide in the same place.

**What this era stops withholding: the dome on a drum, applied symmetry, and glass at the size
of a window opening** — the first two held back by era four for exactly this arrival, and the
third is the quietest and the most far-reaching, because a wall with real openings in it is a
wall that can be composed.

> **CORRECTED 2026-08-01 — two phrases claimed something false about the earlier eras, and only
> the phrases are struck.** The glass row above read *"Windows, **at last** large enough to read
> as openings"*, and this sentence read *"**all three** held back by era four"*. **Roman window
> glass is abundant and well attested** — cast and later blown panes, in frames, in bath houses
> and villas across the empire — so *"at last"* and a claim that era four was *holding glass
> back* are both false of the period era four draws. **The release is untouched and it is
> correct**: what arrives here is glass **at the size of a composed opening**, a rectangle with a
> reveal and a sill repeated across an elevation, which is a fact about how a wall is drawn
> rather than about whether the substance existed. The dome on a drum and applied symmetry
> genuinely were held back by era four for this arrival, so they keep the phrase and the glass
> no longer borrows it.

**There is also a retirement, and it is the only one in the run.** Era five's exposed timber
frame **goes back inside the wall here and never comes out again**. Every other era in the
sequence adds; this one takes a signature away, which is worth stating plainly, because a
player who has just learned to read a town by its frame pattern will lose that reading in a
single era and the loss is deliberate.

---

## 3. Structural language

**Buildings stand up by geometry that was settled in advance**, and the geometry is applied to
the surface as well as being in the plan. Era five braced and propped in the open; here the
structure is regularised into an order and the wall is composed with it.

**This is a silhouette vocabulary, not a checklist of modelled trim.** A production building
chooses the one or two entries below that determine its large form. It does not accumulate all of
them, and pilasters, surrounds, string courses and balustrades are omitted unless they are one
broad plane needed to explain the mass at 128 px.

- **The dome on a drum.** A circular or polygonal drum with a cornice, a lead dome over it and
  **a lantern at the crown**. The lantern is not decoration: it is what stops the dome reading
  as a lid, and it is the silhouette's full stop.
- **The arcaded loggia.** Round-headed arches on piers or columns, open, usually across a whole
  front. This era's way of making a shaded outdoor room and the descendant of era four's
  colonnade.
- **The pilaster order.** A flattened column applied to the wall at a constant spacing, with an
  entablature over it. It is how a wall gets counted without being opened.
- **Symmetry, worked in every direction.** The camera orbits a full circle, so a composed front
  and a blank back is the one failure this era can produce. Compose all four faces: matching
  ends, a legible rear, and the centre marked on each.
- **The segmental arch and the flat lintel over openings**, with a keystone and a moulded
  surround, so the window is a designed object rather than a hole.
- **Ground set out and stepped.** Large slabs in a deliberate pattern, broad shallow flights
  where the ground changes level, and a balustrade wherever there is a drop.

**Heights are stated as an order, and this guide deliberately gives no world-unit targets.**
Every stage is contain-fit to its plot by **one uniform scale**, so the same model stands at two
different heights on two different plots and a number is not something the person authoring one
can aim at. The **ranking** is what an era owes, and it survives re-authoring.

**This era's order, tallest first:** the campanile, with **the domed hall and the council hall
close behind it** — this is the tightest the top three have ever been, because a dome on a drum
and a stack of chimneys both reach for the same band the tower used to own alone; then the
palazzo range; then the arcaded market range; then the drawing workshop; and the parterre court
lowest. **The era climbs modestly over era five** and spends its gain on the dome rather than on
the tower, which is the visual argument the era exists to make. The 24-unit ceiling is still
clear; only era ten's mast is authored to approach it. **The parterre court's ground plane has
not risen since era one** — clipped hedging and a sundial on a plinth stand on it, nothing more.

---

## 4. Ornament and visible technology

**Ornament level: deliberately low in the production models.** Early Modern identity is carried
by the main block, roof prism and one named silhouette feature. A cornice or string course may be
one continuous box strip; a stepped or curved gable is one extruded profile. Do not model
pilaster rhythms, baluster rows, quoins as separate stones, enriched surrounds, medallions or
repeated trim. The City Hall earns scale through width, its two end gables and central cupola,
not a denser façade.

**What to leave out:** sgraffito, fresco, individual masonry units, roof seams, fine relief,
plaques, narrative friezes, swags, cartouches, carved figures, molding teeth and tiny window
grids. This is stricter than the historical permissibility discussion below: a feature can be
period-correct and legible close up while still being too expensive for the direct Three.js
reference. At the city camera, one large profile beats a field of ornament.

> ## ⚑ NARROWED 2026-07-30 — the exclusion said more than it meant, and it caught a roundel it was
> never aimed at
>
> **The rule read:** *"**What to leave out.** Sgraffito, painted fresco, **fine relief panels**,
> swags, cartouches and carved figures. All are period-correct, none reads at zoom-out …"* —
> and `civic-buildings.md` specifies **roundels in the spandrels** on The Painters' School and
> **terracotta roundels** among its materials. Both survived the same day's pass because neither
> reader noticed they conflict;
> `output/imagegen/era-06-early-modern-building-briefs/README.md` found it and left it for a ruling.
>
> **The historical ruling (team lead, 2026-07-30): the roundels were allowed, and the RULE was
> narrowed rather than the
> roundel excepted.** The ban's stated reason is **legibility**, and a roundel is a large medallion
> rather than a fine panel, so it reads at the distance the camera holds. Narrowing is the whole of
> the change: **an exception invites the next one and a precise rule does not**, so the exclusion
> now says what it always meant — fine relief, small-scale carved detail — and the roundel is
> outside it by definition instead of despite it. **The 2026-08-02 production budget is a separate
> complexity ruling:** the roundels remain historically permitted but are not modelled on the
> canonical Painters' School.
>
> **The list is not weakened by the narrowing, and that is worth checking rather than asserting.**
> Every other member of it — sgraffito, painted fresco, a swag, a cartouche, a carved figure — is
> excluded by the same scale test it always failed, and none of them becomes available. What the
> narrowing licenses is exactly one thing: a single carved element big enough to read as one shape,
> and §4 already spends on precisely that class in the cornice, the quoin and the pediment.
>
> **ONE OTHER GUIDE CARRIES THE SAME LOOSE PHRASING, and it is REPORTED rather than swept.** Era
> four's §4 excludes *"The frieze, **the relief carving**, the fluting, the acroterion, the painted
> architrave"* — an unqualified ban on relief, for the same legibility reason, in a section that
> keeps **the inscription panel** four sentences earlier and whose roster then authors *"a carved
> inscription panel on the back wall"* on `POL.3`. So era four already holds the shape this ruling
> rejects: a blanket rule plus a quiet keep-list, rather than a rule scoped to what it means. **It
> is not changed here** — era four's ornament budget is era four's, and this ruling was asked of era
> six — but it is the lead's to rule on and it should not be found twice.

**Visible technology is limited to one oversized readable prop where function needs it:** the
Observatory's telescope, the Mapmakers' House survey instrument, the Printing House press and
the Painters' School easel. The Drawing Office carries its function through the north-light
windows and needs no desk clutter. No plot may exceed three large function props.

**Nothing that implies iron structure, the machine-made unit, soot or the cantilever.** No two
components match because a machine made them; nothing projects without a bracket; the stucco
stays clean; and the smoke goes up a chimneystack rather than staining the wall beside it.

---

## The skill buildings this era introduces

**AUTHORED, not provisional — and this era grew TWICE.** These are the curated sets from
`ERA_SEQUENCE` in `packages/skill-graph/src/eras.ts`, which **answered O-1 in PR #180 (merged
2026-07-28)**. Titles verbatim from `../../../../Node_Spine_v4.md`.

**The 2-lesson Renaissance is gone, and so is the 3-lesson one.** D-ERA3 existed precisely
because two lessons is not an era. #180 did what §3.1 suggested — **`CG.1` joins Geometry here**,
giving the bridge the spec wanted, learn the shapes then learn to put them on axes. Then **#210
(`c668d90`, the same day) moved three more nodes in**, on the rule that *no graph-reading lesson
sits before the era that introduces the plane*: `POL.6` and `POL.7` from the Classical era, and
`RAT.5` from the Medieval. **This era holds six nodes, not three.** It is the largest single
correction in this folder, because the three arriving nodes are the three whose dressings the
other two guides were left holding.

| Node | Lesson | Mass | What it is in this era |
| --- | --- | --- | --- |
| GEO.1 | Pythagorean theorem, similar triangles & basic angle relationships | `hall` | One square observatory tower, one lead dome, one small lantern, 4–6 large windows and one oversized telescope |
| GEO.2 | Area, perimeter, volume & surface area of standard figures | `workshop` | One long two-storey drawing office, one dark roof prism, 6–8 tall north-light windows and at most two dormers; no desk clutter |
| CG.1 | Coordinate plane: plot points, intercepts, distance, midpoint | `yard` | One mapmakers' townhouse, one simple oriel, a small low-walled rear court and one oversized survey instrument |
| POL.6 | Describe polynomial end behavior from degree & leading coefficient | `dwelling` | One **printing house** block with a stepped gable, one loading door, 1–2 chimneys and one large press or paper-bale prop |
| POL.7 | Analyze polynomial graphs: real zeros, multiplicity, turning points | `hall` | One faceted curved **lecture theatre**, one simple dark roof and one small cupola; the exterior mass implies the tiering |
| RAT.5 | Graph & analyze rational functions: domain, intercepts, holes, vertical & end-behavior asymptotes | `yard` | One low broad **cannon tower** with a battered cylindrical wall, exactly three large embrasures and one ramp; no ammunition clutter |

> ## ⚑ `RAT.5` IS RE-AUTHORED AS THE CANNON TOWER — a FORM change, not a rename (consolidated pass)
>
> **The lead is adding a defence lineage, one building per era from era three onward, and era six's
> entry is `RAT.5`.** The row above used to read *"A **cistern court**: an open paved yard around a
> lead-lined tank, a graduated depth-staff standing in it, a pilastered arcade on three sides"*, and
> a gun platform is a different building rather than the same building under another name.
>
> **A previous pending name for this cell, *the Fountain Court*, is SUPERSEDED and not applied.**
> `output/imagegen/era-06-early-modern-building-briefs/README.md` briefed the era against it and
> reported one consequence — that it would have made a third *fountain* in the run beside era four's
> civic **The Fountain** — and that whole line of reasoning is now moot rather than resolved, because
> the building is no longer a water building at all. The collision it reported is gone with it.
>
> **The plot is `RAT.5`'s existing one and is not being asked to move.** `NODE_FOOTPRINTS` in
> `../../../../../apps/web/src/city/worldLayout.ts` gives `"RAT.5": { w: 2, d: 2 }` — **the square
> full plot** — closed by this guide's own footprint block and frozen by INV-ERA-1. The method is era
> two's `yard` precedent: fix the mass and the plot first, then author the new form inside them.
>
> **Two Cannons in adjacent eras is ACCEPTED and is not a defect to be resolved here.** Era seven's
> `FUN.8` becomes the **Cannon Factory**, so the run holds era six's *Cannon Tower* beside it. The two
> are a gun platform and a foundry, which is the *repeated head noun is not the defect, synonymous
> qualifiers are* test passed on the strongest reading: **neither the noun nor the qualifier is
> shared**, only the word *cannon*, and the buildings are a fortification and a works.
>
> **The new form, authored in full at §5's yard entry below**, where the pair separations live.

**Three of those dressings are new here and replace orphans elsewhere.** `POL.6` and `POL.7`
were dressed as a Classical townhouse block and odeon, and `RAT.5` as a Medieval mill yard,
before #210 moved them. Those descriptions are period-correct for eras their nodes no longer sit
in, so the Classical and Medieval guides now point here instead of carrying them. The Early Modern
dressings above are written to the same brief — the same mass, differentiated from the chain
instance by plan and props rather than by new geometry — so no footprint or budget assumption
moves.

**The rewrites are deliberate rather than translations.** `POL.6`'s Classical block was a
townhouse with *no court*, chosen so it could not be confused with the chain's peristyle
dwelling; the Renaissance printing house keeps exactly that distinguishing feature and drops
the peristyle vocabulary the era has retired. `POL.7`'s odeon becomes a lecture theatre because
the raked semicircle is the feature worth keeping and the timber roof is not — this era roofs a
centrally-planned hall with a lead dome. `RAT.5`'s mill yard cannot survive at all: an undershot
wheel on a leat is the Medieval guide's signature working-water motif, and this era has no such
thing. **`RAT.5` has since been re-authored a second time, as the cannon tower** — the banner under
the roster table has it — so the Renaissance cistern court that replaced the mill yard is itself now
history. *(What the cistern court had kept from the mill yard was **an open yard organised around a
water level you can read off a staff**, in lead, paving and pilasters. The cannon tower keeps nothing
from either, which is what makes it a form change rather than a third translation; the era's water
vocabulary survives in the civic **Town Square**'s tiered fountain and in §7's props kit.)*

**This era holds FOUR domains**, more than any other, and `ERA_SEQUENCE` deliberately carries
**no domain field at all** (INV-ERA-5), so era membership is over node ids. That is what makes a
four-domain era unremarkable rather than a special case: Geometry (`GEO.1`, `GEO.2`), Functions &
Coordinate Geometry (`CG.1`), Polynomials (`POL.6`, `POL.7`) and Rational Expressions (`RAT.5`).
The Geometry domain id also moves under the renumber, from D10 today to D6 (D-ERA4); **node ids
do not change**.

**Ownership: this era is ANTHONY'S, entire.** It was jointly held (Anthony 3 / Gabe 3) until
2026-07-29, when the two shared eras were un-split one owner each — Gabe takes the Atomic Age,
Anthony takes Early Modern, moving `CG.1`, `POL.6` and `POL.7`. `CG.1` is a spine node whose
items are Gabe-authored and frozen, so Anthony authors its lesson only. See
`../../../Content_Authoring_Split.md` §10.4.

**Already standing from earlier eras: 26**, and **32 buildings stand by the end of this era.**

> *(This figure was headed **"Re-dressed from earlier eras"** until the 2026-07-29
> re-dressing ruling. Those buildings are not re-dressed; the count is kept because it is a
> true statement about how much city stands here, and is cited from `../README.md`'s table.)*

(The
re-dressed figure was 29 when this era held three nodes; the rebalance moved three nodes *into*
it from eras four and five, so three buildings that used to be standing before this era now
arrive during it. The cumulative total is unchanged, which is the check: 26 + 6 = 32.)

**Footprints are not yet authored for these six** — they resolve to `DEFAULT_FOOTPRINT`, 2×2
(`DEFAULT_FOOTPRINT` and `footprintFor`, both in `worldLayout.ts`), and are **fixed forever**
once authored (INV-ERA-1). **Two masses now carry two roster nodes each** (`hall` for GEO.1 and
POL.7, `yard` for CG.1 and RAT.5), which is expected at this scale and is handled the way era
four handles it: separation by plan, scale and props, never by new geometry.

**The labels above are DRESSINGS, and D-ERA29 makes that a fact about the DATA rather than a
caveat.** A display name is `"{stable}, {subtitle}"`: the **stable** half is era-neutral,
shipped and never moves, and the **subtitle** half is the era's dressing. So the plain naming
pass D-ERA9 asked for has LANDED for the six masses that carry buildings today, and what this
guide owes in its place is a **subtitle row** — one proper-noun dressing per mass, of the kind
era one's §6 already carries. Until this era's row is ratified it shows the stable name alone,
and the same two-part shape applies to the roster nodes above once they have buildings. See era
design §6.2a and `../README.md`.

**Per D-ERA8 neither symbolises its lesson.** The domed hall is not "the Pythagoras building" —
it is ordinary Renaissance civic architecture that happens to host GEO.1. The dome is here
because the era builds domes, not because a dome explains a theorem.

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

> ## ⚑ AMENDED 2026-07-29 — every pair separation below now names a building that will actually stand
>
> **The separations were written against the chain instances, and the banner above means none of
> them is ever drawn.** The domed rotunda, the arcaded market range, the palazzo range, the
> drawing workshop, the parterre court and the campanile are all REFERENCE ONLY, so an artist
> told to separate `RAT.5` from the parterre court was being asked to differ from nothing. **The
> separations themselves are sound and are kept** — *a cube with a face*, *no court*, *a working
> enclosure you enter for one thing* are real design decisions that survive their counterparty
> vanishing — so each is **re-pointed at a live building** instead of deleted.
>
> **Era six is the era where that re-pointing costs least, because it has the most within-era
> pairs of any era in the run:** two nodes on `hall`, two on `yard`, and `../README.md`'s
> eleven-pairs table counts era six among the five eras that hold them. `GEO.1` against `POL.7`
> and `CG.1` against `RAT.5` are both live, both on the ground, and both are what an artist
> actually has to tell apart.
>
> **What is standing on each mass when era six builds**, derived from the six rosters: `hall` —
> era one's Roundhouse, era two's Meeting House, era three's Merchants' Hall, era four's Custom
> House, era five's Guild Hall, and now **two of era six's own**, seven in all and the crowded
> mass; `dwelling` — era one's Hut Cluster and era five's row, only **three** with `POL.6`, still
> the emptiest mass; `workshop` — era one's Tool Shelter, era two's Potter's Kiln, era three's
> Bronze Foundry, era four's two, era five's Weaver's Shop, seven with `GEO.2`; `yard` — era
> one's Clearing, era two's Sheep Pen, era three's Ingot Yard, era four's Barracks, six with
> era six's two. **`store` and `tower` carry no era-six node**, so the arcaded market range and
> the campanile are drawn by nobody and the *Cloth Hall* and *Bell Tower* subtitles are inert.
>
> **`output/imagegen/era-06-early-modern-building-briefs/README.md` re-derived the confusion set
> against the standing city** rather than copying §5, and the axes below are that document's.

Era one set seven masses and froze their plots, and this era inherits a chain five links long.
The six new nodes above take the same masses, so **a mass can carry more than one dressing
here** — the dressing below is the one carrying the chain, and a roster entry on the same mass
is a further instance of it, differentiated by **scale, plan and props rather than by new
geometry**, as era four's basilica and tholos are. All six of this era's new nodes land on
masses the chain also uses, so every one of them needs that said: **the hall twice** (`GEO.1`
and `POL.7`), **the yard twice** (`CG.1` and `RAT.5`), **the workshop** (`GEO.2`) and **the
dwelling** (`POL.6`) — four masses, with `store` and `tower` carrying none.

> **CORRECTED 2026-07-29 — this paragraph still counted the roster before #210 doubled it.** It
> read *"**The three new nodes above** take the same masses … All three of this era's new nodes
> land on masses the chain also uses, so every one of them needs that said: **the hall, the
> workshop and the yard**."* The roster three sections above has **six** nodes on **four**
> masses, and this guide's own head banner already gets it right (*"Its own 6 new nodes'
> buildings, on four masses"*), as does `../README.md`'s table (*"the largest correction in the
> folder: roster 3 → 6"*). `ERA_SEQUENCE`'s `renaissance` entry is `["GEO.1", "GEO.2", "CG.1",
> "POL.6", "POL.7", "RAT.5"]`.
>
> **The consequence was not cosmetic.** Enumerating three masses is why §5 states no separating
> axis at all for `POL.6`'s printing house against the `dwelling` chain — the one roster node
> this section never covers. The roster line supplies it in three words, ***"No court"***, and it
> is carried into the `dwelling` item below.

**The six ordinary types, and era one's mass names for them.** Per §6.1 of the era design the six ordinary types are dwelling, workshop, store, hall,
tower and yard, and **since 2026-07-29 those six words ARE the mass ids** — so there is one
vocabulary here rather than two. Era one's guide and `buildingAssets.ts` had kept the retired
Gridwork art's own names (*deco*, *slab*, *rowhouse*, *school*, *park*) because that art was
what the ids were coined for; the old-to-new mapping was **already one to one**, so no mass
was reused and no two nodes collapsed onto one id. **Nothing on disk moved** — a GLB filename
is built from the node id, never from the mass. Plus the `town-hall` landmark.

**Footprints are frozen, and this guide does not restate them.** INV-ERA-1 lets an era change
silhouette, height and material and never which cells a building occupies, so plots are named
in words: the hall and the dwelling share **the square full plot**; the store is **the long
two-cell strip**; the yard is **the two-cell strip on the short axis**; the workshop has **a
single tile**; the landmark has **the wide plot**. The table lives in
`../era-01-prehistoric/style-guide.md` §6 and that is the only copy of it.

**The tower's plot is deliberately not named**, for the reason
`../era-02-neolithic/style-guide.md` §5 records: it was set to a single tile and reverted to the
square full plot on 2026-07-28, because a contain-fit applies one uniform scale and a smaller
plot therefore shrinks a model whole rather than making it slender. **Slenderness is a property
of the model.** So this guide describes the tower's proportions and lets era one's table own its
cells.

**Hall — the domed hall.** *Through-line: one big communal roof.* The square full plot.
A **drum on a circular plan** with a cornice at its head, a lead dome over it and **a lantern at
the crown**, entered through a shallow porch on one side. **The tallest roofed
room on the island, and close enough to the campanile that the two read as a pair** — this is the
one era in the run where a roof nearly catches the tower. This is the arrival the chain has been
building towards for four eras: era
one's cone of thatch, era two's mud-brick drum, era three's corbelled drum, era four's ring of
columns, era five's polygon on a central pier — and here **the central pier goes and the roof
carries itself**, which is the single largest structural improvement any mass makes in the run.
The room is one span over a crowd and always has been.

**Chain flag: two domed halls want to exist in this era, and this is the second time the
collision has come up.** Era one's §6 predicts the hall becomes *"a granary rotunda, then a
basilica, then a domed hall, then a transit concourse"* — and this is the era that delivers the
domed hall. But **GEO.1 in the roster above is already dressed as a centrally-planned domed hall
on a square plan**, so following the prediction naively puts two domed halls on one small island
in one era.

**Resolution, and it is the same one era four reached: the chain keeps the round plan it has had
since era two.** The chain's hall is **a drum on a circle**; **GEO.1's is the square-plan one**,
with a rusticated base and an arcaded loggia across its front. The pair separates in plan and in
approach — one is a cylinder you walk round, the other a cube with a face — and that difference
holds at any zoom. Era four's guide recorded the identical collision one era earlier, when the
prediction's basilica ran into POL.3's, and resolved it the same way. **Two occurrences make it
a pattern rather than a one-off**, and both are worth Evan seeing together: era one's §6
prediction is a sentence written before the later rosters existed, and it now needs correcting
twice over.

**The chain's rotunda is REFERENCE ONLY and is never built, so the live hall pair is `GEO.1`
against `POL.7` — two roster nodes on one mass, and the one an artist actually has to resolve.**
Both are domed and both carry a loggia, so *domed* separates nothing; they separate on **scale,
plan and what is under the dome**. `GEO.1` is the **larger, square-plan** one, rusticated base, a
loggia **across the front only**, and nothing inside it but the span — the tallest roofed room on
the island. `POL.7` is the **smaller** one, its loggia on **two** sides, and **raked semicircular
seating under the drum**, which is the whole of its identity and reads through the openings from
the camera's tilt. A big empty span with one face against a small span with a bank of seats in
it holds at zoom-out. Outside the era, the halls `GEO.1` and `POL.7` stand beside are era five's
Guild Hall (open underneath, entered anywhere along an arcaded front, under one steep tiled
ridge), era four's Custom's House (a long aisled shed with a clerestory and an apse), and the three
older single-level ridged halls — **and the dome answers all five at once**, since era six is the
first era in the run that has one.

**Store — the arcaded market range.** *Through-line: a long horizontal roof, contents
on show.* The long two-cell strip. A long **arcade on the ground floor** — round-headed arches
at a constant spacing — with a stuccoed upper storey over it and a shallow lead roof above
that. **Still low and long against everything but the workshop.** The contents show **in the
shade behind the arcade**, which is era four's
answer rebuilt with a closed head on every opening, and the upper storey is what this era adds:
the goods are on show and the value is stored above them.

**Dwelling — the palazzo range round a cortile.** *Through-line: several small
dwellings, one shared yard.* The square full plot, shared with the hall. A symmetrical range
with a rusticated base and two stuccoed storeys over it, a centred entrance passage, and the
shared ground behind become **a formal court with an arcade on two sides**. **Above the market
range and below the council hall**, and it climbs less here than it did in era five, because this
era spends its height on the dome instead.

**The yard has been formalised, and the through-line survives it narrowly.** Era five's was a
working back yard with a well and a midden; here it is paved, arcaded and composed. Several
dwellings still share one piece of open ground, which is all the chain asks — but **the court is
now a room, and a room is one decision from being roofed.** Keep it open to the sky and keep the
domestic evidence in it: a well-head, a stack of pots, a line of washing on the upper arcade. It
becomes a brick back court, then a shared lawn, a podium courtyard, and a lit void in a rack.

**`POL.6`'s printing house is the dwelling era six actually builds, and §5 never gave it an
axis** — an omission the corrected node count above explains, since enumerating three masses left
`dwelling` out of the list this section works through. **The roster line supplies it in three
words: *"No court"*.** The chain's palazzo range wraps a formal cortile with an arcade on two
sides; `POL.6` is **one compact printing-house block with no court**, one stepped gable, one
loading door and at most two chimneys. That is the axis era four's guide found when `POL.6`
was a Classical townhouse and it travels with the node: **the court is the through-line, and the
roster instance is the one that does not have it.** *(The chain's range is REFERENCE ONLY and is
never drawn, so the live comparison is with what is standing: era five's row of three jettied
gables — one warm-buff stuccoed block against three separate steep tiled gables in
an oak frame — and era one's Hut Cluster. `dwelling` is still the emptiest mass in the run, which
is why this axis has had so little to do.)* Watch the ends, per D-ERA8: `POL.6` hosts **end
behaviour from degree and leading coefficient**, so **its two ends must not step up, taper or
mirror one another.** A row of houses whose ends rise is a graph.

**Workshop — the drawing workshop.** *Through-line: a room made legible by its light.* A single
long block with **6–8 tall north-lit windows** filling one wall, one dark roof prism and at most
two dormers. Tables, plates, rods and plans are not exterior props. **Still the lowest roofed
building in the era**, and
kept that way deliberately: the era's instinct is to make everything a small palazzo, and this
one has to stay a place where work happens.

**GEO.2's drawing and surveying workshop is the same dressing on a larger plot**, and the pair
would separate by scale and instrument rather than by plan: GEO.2's is the bigger, fully fitted
one with rods and a plane table stood against the wall, while the chain's is the small
single-tile version whose whole content is one light source and one surface to draw on. **The
open floor is now glazed rather than open**, which is a strain worth noticing a full era before
era seven roofs it over completely: the north window is a wall, however much light it lets in.
Keep the ground-floor doors wide and standing open, and keep work spilling onto the paving.

**The chain's small workshop is REFERENCE ONLY and is never built, and this is the crowded mass —
seven workshops are standing when `GEO.2` goes up.** The two that need answering are **era five's
Weaver's Shop**, which is also a two-storey working front on a street (it separates on
**aperture**: shutters that fold down flat into counters against a **run of tall fixed north
windows**, and an oak frame against stucco over a rusticated plinth), and **era four's Measuring
Shop** (`POL.8`), which is the other instrument-and-drawing building on the island — that one is
an **enclosed ashlar box whose floor you cannot see from outside**, where `GEO.2` is a long range
whose whole point is that you can see the drafting tables through the glass. **The long plot is
`GEO.2`'s own separator and was chosen for it**: era five's and era four's workshops are all
square, and a run of windows down one side is a long building. Era three's Bronze Foundry and era
two's Potter's Kiln answer on fire — **nothing on `GEO.2` burns** — and era one's Tool Shelter on
scale.

**Yard — the parterre court.** *Through-line: open ground deliberately kept open.* The
two-cell strip on the short axis. Low clipped hedging in geometric beds with gravel walks between
them, and **a sundial on a plinth** where the walks cross. **The lowest plot on the island**: the
hedging is knee-high and the sundial is the tallest thing on it, and **the ground plane has not
risen, here or in any era.**

**Two roster nodes land on this mass — `CG.1`'s surveyed piazza and `RAT.5`'s cannon tower — and
they are what era six actually builds on it.** The parterre court carries the chain and is
REFERENCE ONLY, so it is shape language rather than a live counterparty; **the pair that has to
be told apart on the ground is `CG.1` against `RAT.5`**, and **that pair is now easier than it has
ever been**, because one of the two has stopped being a yard. The form, authored in full:

> **A low broad cannon tower on the square plot.** One squat faceted cylinder, markedly wider
> than it is tall, splays outward at the foot into a battered base. One plain parapet ring closes
> the top. **Exactly three large embrasures** are cut into the upper wall, and **one broad ramp**
> climbs one flank. That is the complete production silhouette: no visible guns, shot pile,
> powder hutch, tools, crew or scattered ammunition. The ground is one compacted-earth plane.
> **No pilasters, lantern, dome, balustrade, glazing or individually modelled stones** — this is
> the only building era six draws with no window in it.

**It rises, and that is what makes the pair trivial now.** `CG.1` is ground you cross and `RAT.5` is
a drum you climb: **flat against standing**, which survives any zoom and needs no prop to carry it.
The old separation — *a public room you cross against a working enclosure you enter for one thing,
its ground falling to the tank* — was a genuine plan difference between two flat courts and it was
the right answer to the question as it stood; **it is retired because its counterparty is gone**, and
the closure block below records that history rather than deleting it. **The depth-staff worry goes
with it**: §4 forbids a prop as a sole separator, and nothing about this pair now rests on a prop.

**Where the drum must not read as era six's own tower.** `RAT.5` and the chain's **campanile** are
both round-ish vertical stone objects, and they are the era's only two, so the axis is stated: the
campanile is **slender, plain-shafted and open-headed** — a blank stuccoed shaft with an arcaded
belfry and a lead cupola — and the cannon tower is **squat, rusticated and closed-headed**, wider
than it is tall, with a coping and embrasures where the other has arches and a cupola. **Tall and
open against low and shut**, and the campanile is REFERENCE ONLY in any case, so this is shape
language rather than a live pair. The live vertical rival is **era three's Stronghold** (`LIN.6`,
`tower`, 2×2), the lineage's own first entry and also a fortification: it separates on **fabric and
plan** — era three's is corbelled ochre mass with a walkway across its head, square on plan, and
this is a rusticated pale drum with a splayed base and a ramp. The lineage is meant to read as one
line, so **a family resemblance is correct here and a confusion is not**: same purpose, two
centuries of masonry apart.

**D-ERA8's temptation is at its sharpest on `CG.1`.** A paved court set out with a measured grid,
for the lesson that introduces the coordinate plane, is one careless step from being a diagram of
it. So: **the grid is a surveyor's baseline with offsets taken off it, not a pair of axes.** No
origin, no quadrants, no numbered divisions, nothing running to the plot's edges, and the rods
and the plane table standing on the paving as the working instruments they are. It is a set-out
court because this era sets out its ground before paving it.

**Outside the era, the yard-mass buildings `CG.1` and `RAT.5` stand beside are era four's Barracks,
era three's Ingot Yard, era two's Sheep Pen and era one's Clearing**, each in its own era's clothes.
**The one worth naming is now era four's Barracks rather than its paving**, because era four's yard
entry was re-authored in the same pass and it is the closest thing on the island to `RAT.5`: both are
military, both stand on the yard mass, two eras apart. They separate on **plan and silhouette** — era
four's is a **long single-storey range of cells behind an arcade** on a 2×1 strip, a place a garrison
lives, and this is a **squat closed drum with embrasures** on a 2×2 square, a place a gun stands.
*(This paragraph named era four's Stone Yard until the consolidated pass; the paving comparison it
made went with the building.)* `CG.1`'s own outside rival is unchanged and is still era four's ground
seen at a distance: **set out** against **heaped**, a measured baseline against sawn stone.

**The chain's own plot still never rises, and that is now a narrower claim than it used to be.** The
parterre court becomes a works yard with rails let into the setts, then a municipal park, a dish yard,
and a steerable dish yard on a deck — none of them taller than this, and that is the chain's
discipline rather than an oversight: while every other mass climbs towards the ceiling, something has
to hold the bottom of the band, and deliberately open ground is the only honest way to hold it. **What
is no longer true is the wider reading** — *"in all ten eras this is the one plot that never rises"* —
because the defence lineage puts a standing building on the yard mass in era four, **here**, in era
eight and in era nine. The chain instance holds; the mass does not, and era six is the era where it
stops, since `RAT.5` is a tower on the ground the chain keeps flat. Eras eight, nine and ten each
restate the wider version in their own §5 and each is corrected there.

**Tower — the campanile.** *Through-line: a slender open frame you climb to see from.*
A plain stuccoed shaft with quoined corners, **an open arcaded belfry stage** at
the top and **a lead cupola** over it. **The tallest thing on the island, but only just** — the
domed hall and the council hall are both within reach of it, which makes this the one era where
the tower has to be authored carefully to keep its lead. The shaft's proportion is the lever:
narrower against its height than either of them.

**The climb is more visible here than in era five, and less than in era one.** Era five's
louvred belfry half-showed the room at the top; an arcade is genuinely open, so the top stage
is a frame you can see daylight through from any angle the camera orbits to — which is the
era-one read achieved with this era's materials. **Keep the arcade unglazed and the shaft plain**,
because the contrast between a blank shaft and an open head is the whole silhouette. It becomes
an open iron tank stage with an external stair, then a lattice pylon that opens the frame
completely, a comms mast, and a comms tower brushing the ceiling without exceeding it.

**Landmark (`town-hall`) — the City Hall.** *Through-line: a sheltered communal fire.* The wide
plot. **One dominant symmetrical civic block, two simple end gables, one central lead cupola,
10–14 large windows and at most three plain chimneys.** It is level with the domed hall and just
under the campanile, so the top three all sit in one band.

**Chain flag: the chimneys are enough.** Era five moved the fire indoors and kept it legible with
a louvre over the middle of the floor. Here the hearth goes to the wall. Two or three plain
chimney boxes retain the lineage without clustered stacks, mouldings, smoke effects or a roof
forest. It becomes an engine house whose
fire is a boiler and whose smoke is the island's tallest chimney, then a heating plant showing
only its plume, a data hall whose fire is invisible, and a lit plant stack exhaling steam
through gratings people still gather at. **The fire never goes out; it only becomes harder to
see.**

---

## The island (D-ERA26)

The era that **surveys** the island. Nothing here is new engineering so much as newly *measured*
— the medieval sprawl gets straightened, faced, and set out to a drawing.

**The step from era five, and this era changes the ground's PATTERN rather than its material.**
Era five's floor was broken, patched, rutted and muddy, laid in fans by a setter making it up as
he went, with lanes that bent and nothing about an axis. **Era six re-lays the same stone to a
drawing.** The material barely moves — it is dressed stone again, as era four's was — and
everything else does: **the pattern, the levels and the axis.** That is the advance, and it is
legible because §1's signature applies to the ground more directly than to any building: *a
drawing built to a line*, and **the largest flat surface on the island is where a drawing shows
best.**

**Ground.** **Geometric paving:** large slabs laid in a deliberate pattern — banded, or set
diagonally, or radiating from a centre — with **the pattern surviving across the whole open
ground rather than stopping at each building**. That continuity is the whole point and is what
separates this ground from era four's: era four laid a regular bond and let each building sit on
it, where era six composes the entire square as one figure and puts the buildings inside it.
**A player should be able to see where the centre of the composition is** without anything being
built there.

**Levels are stepped deliberately**: broad shallow flights and platforms where the medieval
ground merely sloped, each edged with a **moulded** step rather than a plain one. **Era five's
sinking and rocking is gone entirely** — this ground is flat, true and re-laid, and its
flatness is a stated achievement rather than a default. The gutters are **dressed channels** now,
and there are drain grates.

**And the setting-out is drawn ON the ground, not merely used to lay it.** Bench marks and a
**meridian line** cut into the paving, a compass rose or a radiating figure at the centre of the
main square, joint lines that continue as lines rather than as accidents. **This is the one era
in the run whose instrument lives underfoot**, and it is the cheapest way to say *surveyed*
without any building doing the work.

**Shoreline.** An **embanked** edge: the medieval timber revetment is replaced by a battered
ashlar embankment with a moulded string course and a balustrade along the top. It is a
*promenade* as much as a defence — the crenellations are gone, the wall is lower, and there are
places built specifically to stand and look at the water. Broad steps descend into it at
intervals, and **the whole line is gently curved rather than following the old bank** — a curve
that was drawn, which is a different thing from a curve that was inherited, and the difference
should be visible where the new line cuts across the old.

**Vegetation.** Formal again, and more ambitious than the Classical version. **Parterres** —
low clipped hedging in geometric beds, gravel walks between them — plus avenues of matched
trees, topiary at the corners, and citrus or bay in pots along the balustrade. Every plant is
placed and most are clipped. Wild vegetation exists only outside the balustrade, hanging down the
embankment face. **The parterre is the paving's pattern done in hedge**, and the two should
obviously be the same drawing in two materials; era four's avenue was a line, and this is a
figure.

**Where boats land.** A **designed** landing: a symmetrical stone stair descending to the water
between two pedestals, mooring rings rather than bollards, and a covered landing loggia. Working
cargo has been moved to a separate plainer wharf to one side, which is itself a Renaissance
decision — the ceremonial arrival and the goods entrance are now different places.

**Water.** Calm, dark, and used as a **mirror** — the design assumes reflection, so the water
edge is kept clean and the balustrade is built to be seen doubled. Still silting in the corners,
still dredged, but the visible water is managed for looks. **This is the only era in the run in
which the water is part of a composition**, and it is worth holding: era seven puts an oily
sheen on it four eras before anybody cleans it again.

**Signs of habitation at the margins.** A sundial on a plinth. Surveying marks cut into the
paving — bench marks, a meridian line. Stacked drawing frames and rods near the workshops. A
walled garden with a well. Fewer middens and more storage. **Rolled and stacked printed sheets
and an engraved plate in a rack** where era five chalked a slate.

**Against the roads (D-ERA30).** Era six is the only era in which **the road is part of a
figure**. Era four's route was distinguished from the ground by kerb and wear, era five's by
damage; here it is distinguished by **being drawn as a band inside the pattern** — a differently
laid strip that the composition acknowledges, with the paving pattern changing at its edge rather
than being interrupted by it. So the relation is: **the road does not break the ground's pattern;
it is one of the pattern's members.** Whoever writes era six's surfacing row should reach for a
band with a *dressed channel* at each side and a *drain grate* course, and should keep it the
same stone as the ground. **If the row makes era six's road a different material from its floor,
that contradicts this section and one of the two is wrong.**

**What the era's own absent list rules out of the ground.** §2 withholds **structural iron and
machine-made brick**, **soot as a finish**, **reinforced concrete and the cantilever**, and the
**unitised curtain wall**. Two of these are exactly what a geometrically paved city reaches for:

- **No machine-made component, so the pattern is achieved by SETTING OUT and not by identical
  units** — and this is the era's most interesting ground constraint, because it is a genuine
  tension rather than a restriction. A banded, radiating, mathematically composed floor **made
  of pieces no two of which are identical**: every slab is cut to the drawing by hand, so the
  pattern is exact and the units are not. **That is the difference between this floor and era
  seven's setts**, which achieve a coarser pattern out of perfectly identical pieces, and it is
  the thing that makes 6 → 7 read.
- **Soot is absent as a finish, so this island's stone is CLEAN even where it is old.** That is
  counterintuitive and needs saying, because an artist rendering a centuries-old stone city will
  reach for grime in the joints by reflex. **Era six's paving is washed, its balustrade is pale,
  and its joints are not black.** Era seven owns dirt, and it owns it completely.
- **No iron grating that is a machine product.** The drain grates above are hand-made — cast or
  wrought individually, small, and no two identical — which is the same rule as the cobbles.
- **No reinforced concrete and no cantilever**, so **every step, coping and projecting balustrade
  member is carried on something you can see.** Nothing on this island oversails without a
  bracket, including landscape work.

**Contrast against the buildings, and this remains no pale-on-pale case.** Body hue **warm buff
lime plaster `#C7A48E`** above a **pale dressed-stone base and trim `#D8CDB3`**, with localized
hand-made brick `#B1775A` and **dark slate/lead `#596675`** on every roof — on a pale
dressed-stone floor. At L\* 69.9 the wall sits **20.9 L\* below the paving** (`#ECE4D3`) and
24.1 ΔE76 from it, while the roof sits 39.4 ΔE76 from the wall.
*(History: it called itself the SECOND such case, then the third. Both readings were about
`#E9C2A1` and `#CDBB9E`, which were L\* 81.0 and 76.7 — genuinely pale. The complaint that
**era four had a strong terracotta roof to separate wall from ground and era six's cool lead
accent was nearer to the paving than the wall was** is answered by a darker roof and a wall
that moved down and warm.)*

**What resolves it, in order of how much work each does:**

1. **The rusticated base is the answer and it is already in §2.** *Heavy, deeply channelled*
   stone at the bottom of every wall gives each building a **dark banded plinth** exactly where
   it meets the floor — a shadow line the flat lighting model would not otherwise produce.
   **Era six should never draw a building whose stucco runs to the ground.**
2. **The paving goes cooler and greyer than the buildings.** The body hue is *warm* stucco; keep
   the floor grey and let warmth belong to the walls.
3. **The parterre hedging breaks the field.** Large areas of clipped green inside the pale stone
   are what stop the open ground reading as one undifferentiated pale plane.

**And the accumulated city is now genuinely hard**, which era five's entry predicted — though
the membership of the hard group has changed twice and the current membership is worth stating.
Standing on this floor, **the pale group is now TWO**: era two's straw-tempered brick (L\* 79.1)
and era four's limestone (80.7). **Era six remains outside it**, at L\* 69.9,
which is why the paragraph above no longer calls itself a pale-on-pale case. Era five's
lime-wash sits at 64.0 with era one's terracotta (62.8) and era three's patina (44.1) in the
mid-to-dark group. **The ground still cannot solve a pale pair for both of them**, since any
value that separates one is closer to the other, and era two and era four separate from each
other on **chroma** rather than lightness (C\* 32.2 against 16.3). **The durable resolution is
that each pale era carries its own dark element at ground level** — era two's undressed-stone
footings, era four's kerb and coping — and era six keeps its rusticated base for the same
reason even though it no longer needs it as badly. Recorded here because era six is where it
stopped being a coincidence and became a rule.

**The read:** the same island, re-drawn. This is the first era where the ground itself looks
*composed*, and the last era before industry stops caring how it looks.

---

## The era's palette (PROPOSED — D-ERA27)

**Status: selected 2026-08-03.** Per **D-ERA27** hue is an **era** property rather than a domain
one, so this era owns a palette. Derived from the Northern Early Modern material language above,
kept low-saturation, and sitting on
§1.1's calm parchment base — `#ECE4D3` ground, `#D9CCB2` deep ground, `#8FA9B8` slate-mist water —
rather than competing with it.

| Role | Proposal | Hex |
| --- | --- | --- |
| **Body hue** | Warm buff lime plaster | `#C7A48E` |
| Accent | Dark cool slate and sheet lead, on every roof | `#596675` |

**Why this hue.** A warm buff limewash over masonry, restrained hand-made red-brown brick,
pale dressed-stone trim and dark slate or lead roofs are representative of a Northern Early
Modern town without borrowing Era 4's pale limestone field or Era 7's soot brick. The body is
an **applied, chosen** finish rather than a quarried one, and the cool roof is a large,
deliberate counter-field. `../../2026-07-30-era-palette-ladder.md` §12 records the exhaustive
CIELAB search: `#C7A48E` is L\* 69.9, C\* 18.9, h 59.5°, clears both existing guards with no
exception, sits 10.8 L\* and 15.4 ΔE76 from Era 4, and is 24.1 ΔE76 from its ground.

**The supporting materials are deliberately not extra global palette roles.** Localized brick is
`#B1775A`; pale dressed-stone trim is `#D8CDB3`. The ladder continues to track the body and its
principal roof accent only.

> ## ⚑ SUPERSEDED PALETTE HISTORY — 2026-07-30 THROUGH 2026-08-01
>
> **The lead, on the delivered art:** era six *"looks extremely similar to era four with the
> roofing, building types and just general feeling."* Measured, he is right on both axes and
> the two compound.
>
> **The hue was separated from era four on one channel only.** `#E9C2A1` sat at **L\* 81.0**
> against era four's limestone at **80.7** — a lightness gap of **0.32** — with the whole of
> the difference in hue (27.8°) and a little chroma. The 2026-07-30 pass measured that pair at
> in-situ 8.39 and called it repaired, which was true of the scalar and blind to its
> composition.
>
> **And this era was wearing era four's identity device on its biggest surface.** Era four's
> guide says *"the terracotta roof accent `#B4674A` is what actually separates a building from
> the ground"*, and §2 below gave era six terracotta pan-and-cover tile on everything not
> domed. Two eras, one lightness, one roof material, one pale cool stone ground.
>
> **The 2026-08-01 correction moved both axes.** Roofs became lead and the pale peach body
> became a dusty-rose intonaco. That solved the Era 4 collision mathematically but made a
> southern rose finish the dominant wall field of a Northern Early Modern set. The current
> buff/slate palette supersedes it without weakening either guard.
>
> *(The earlier 2026-07-30 note read: `#CDBB9E` moved to `#E9C2A1` because "warms back up"
> was not happening — the old value sat at hue 84° against era four's 90°, ΔE76 2.7 apart. That
> diagnosis was right and its remedy was one channel short.)*

**One body hue per era.** Within the era, buildings **share the body hue and differ by silhouette
plus accent**, never by a second body colour. That is the one rule that survives `City_Art_Bible.md`
§1.2's retirement, now applied per era instead of per district.

**`#FFB703` is not available**, here or in any era: it is the mastery accent carried on the stars
above a topped-out building, never a material.

---

## 6. The three construction stages

All thirty-two buildings get three models each. The stage names are fixed in code
(`buildingAssets.ts:41`), and the era's job is to make the sequence read as *this era's* way of
building — which here means the finished building is on the site, in miniature, before any of it
is standing.

| Stage | Engine states | Early Modern read |
| --- | --- | --- |
| **`site`** | `not_started`, `preview` | Pegged and levelled to a drawing, with **the drawing itself weighted flat on a trestle** beside the plot and **a wooden model of the finished building on a stand** next to it. Squared stone stacked in sorted sizes, lime and sand in separate heaps. Flat, ankle-height at most except for the model and the trestle |
| **`construction`** | `teaching`, `practice` | A **braced, measured scaffold** rising off a levelled base, **timber centring ribs** under every arch, and where there is a dome, **the dome rising in courses with no full centring under it** — a ring of completed courses standing open at the top |
| **`built`** | `unfinished`, `complete`, full mastery | The finished building as described in §5 and in the roster. `advanced` (mastery ≥ 2) and full mastery both reuse this model — there is no separate gilded version, and mastery rides above it as stars (`buildingAssets.ts:28-31`) |

**The model on its stand is the era's unmistakable image, and it is unique in the run: no era
before this one shows you what the building will be.** Era one drove stakes, era two dried
bricks, era three hung a plumb-bob, era four scratched the plan at full size on a slab and era
five scribed curves into a plaster floor — every one of them a record of a decision, and none of
them a picture of the result. A small painted timber model standing beside an empty plot is worth
more than any amount of scaffolding detail, because it makes the site stage **legible as
intention** rather than as absence.

**The self-supporting dome is the construction stage's dating device.** A ring of courses closing
inward over open air, with the scaffold stopping at the drum, says something no earlier era's
site can say: the builders know the shape will hold before it is finished. Keep the top open and
the courses visible, and let one building on the island always be at that stage.

---

## The subtitle row (D-ERA29)

One proper-noun dressing per mass, ratified for wiring into `apps/web/src/city/eraDressing.ts`.
Per **D-ERA29** a display name is `"{stable}, {subtitle}"`, the stable half never moves, and the
subtitle **enters the accessible name a screen-reader user hears** — which is why these are
capitalised proper nouns rather than the lower-case running prose of §5.

| Mass | Stable name | **Early Modern subtitle** |
| --- | --- | --- |
| `hall` | Assembly Hall | **the Observatory** (`GEO.1`) / **the Lecture Theatre** (`POL.7`) |
| `store` | Store | **the Cloth Hall** |
| `dwelling` | Dwellings | **the Printing House** |
| `workshop` | Workshop | **the Drawing Office** |
| `yard` | Commons | **the Mapmakers' House** (`CG.1`) / **the Cannon Tower** (`RAT.5`) |
| `tower` | Tower | **the Bell Tower** |
| `town-hall` (hub) | Civic Center | **the City Hall** |

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

**The through-line: a city re-drawn to a measured drawing, so its buildings are where the measuring
and the drawing happen.** This is the era whose vocabulary the naming rule has cost the most, and
the answer is the same as before: the rustication, the cornice and the dome carry the era, not the
words.

- **the Observatory** (`GEO.1`) and **the Lecture Theatre** (`POL.7`) for the Domed Hall. Two nodes
  share `hall` here. *Domed* is a weak adjective over a bare function word, and both buildings are
  domed, so it could never have separated them. `GEO.1` is **a square-plan hall carrying a drum
  and a lantern at its crown**, which is what a learner pictures when they hear *observatory*, and
  this is the era that first pointed instruments at the sky. `POL.7` is the roster's own *lecture
  theatre* — raked semicircular seating under the drum — and public lecturing is as Renaissance as
  the dome is. *(The plan was added 2026-07-29. This read "`GEO.1` is a drum with a lantern at its
  crown", which is not wrong — a square-plan building carries a drum and a lantern over its centre
  perfectly well, and the roster authors exactly that — but the sentence leaned on the one feature
  §5's separation from the chain rotunda does NOT turn on, since the chain's hall is a drum too.
  The separator is the plan: "one is a cylinder you walk round, the other a cube with a face.")*
- **the Cloth Hall** for the Arcade. *Arcade* now reads as a shopping precinct or a games arcade;
  §5's long ground-floor arcade of round-headed arches with the goods showing in the shade behind is
  a cloth hall, which is the building a Renaissance trading city actually put there. Inert: no node
  on `store` here.
- **the Printing House** for the Town Houses, which collided with the civic **Merchant Houses**
  in this same era — two housing buildings, one era, both *&lt;adjective&gt; Houses*. `POL.6` is the
  roster's own printing house, and the printing trade is the one thing this era has that no
  earlier era does.

  > **RENAMED to *the Printing House* in the consolidated pass.** The cell read **the Printers'
  > Terrace** and the reasoning above is unchanged and still load-bearing: it is the printing trade
  > that does the era's work, and the collision with the civic *Merchant Houses* is still the reason
  > this cell could not be *&lt;adjective&gt; Houses*. What moves is the second word. **`Terrace` was
  > the weaker half** — it names the mass's own arrangement rather than the building, which is the
  > shape `../README.md`'s naming pass exists to catch, and *terrace* additionally reads in American
  > English as an outdoor deck rather than a row of houses. **The building is unchanged**: §5 and the
  > roster still author a party-walled range with a rusticated ground floor of shop fronts, smooth
  > stucco above, a chimneystack at each party wall and **no court**, and *no court* is still the
  > separator §5 relies on.
  >
  > **It joins the *-House* family and that is judged rather than assumed.** With era four's *the
  > Custom's House* keeping its *House* and era seven's civic *The Wash House* leaving the list as
  > *The Food Works*, era six now contributes two — *the Printing House* and *the Mapmakers' House* —
  > and both qualifiers are concrete trades rather than weak adjectives, which is the test the family
  > is kept under. `../README.md` carries the re-counted list.
- **the Mapmakers' House** (`CG.1`) and **the Cannon Tower** (`RAT.5`) for the Paved Square. Two
  nodes share `yard`. *Paved* is weak, and it also sat against the civic **Town Square** in this
  same era. `CG.1` is a paved court set out with a measured grid, ranging rods and a plane table, and
  **a mapmaker is the concrete era-locked person who owns exactly those instruments** — this is the
  era of the surveyed plan, and `CG.1`'s lesson is the coordinate plane. `RAT.5` is **re-authored as
  the cannon tower**, era six's entry in the defence lineage, so the cell names the building the
  roster and §5 now author.

  > **BOTH CELLS MOVED in the consolidated pass, and for different reasons.**
  >
  > **`CG.1`: *the Surveyors' Yard* → *the Mapmakers' House*.** The old name was *the mass's function
  > with a job title in front of it*, which is half of the shape the naming pass rejects, and it stood
  > **one apostrophe away from era four's `POL.8`** — *the Surveyors' Yard* against *the Surveyor's
  > Shop*, plural-possessive against singular-possessive, two eras apart and both standing on the
  > island at once under the freeze. `output/imagegen/era-06-early-modern-building-briefs/README.md`
  > reported that near-collision; **it is closed rather than tolerated**, because era four's cell was
  > renamed *into* `Surveyor's` in the same pass and leaving both would have made the pair worse. The
  > two now share no word.
  >
  > **`RAT.5`: *the Cistern Court* → *the Cannon Tower*, and this is a FORM change.** The banner
  > under the roster table has it in full. **A previously pending *the Fountain Court* is superseded
  > and was never applied.** The separation this bullet used to rest on — *"these two separate by
  > plan, which §4 requires and a prop alone cannot supply — a public room you cross against a
  > working enclosure you enter for one thing"* — is **retired with the building it described**, and
  > §5 records why: the pair is now flat ground against a standing drum, which needs neither a plan
  > argument nor a prop.
  >
  > **`Cannon Tower` on the `yard` mass announces as "Commons, the Cannon Tower", and that is
  > accepted.** A dressing name may disagree with its mass handle — the lead accepted *"Store, the
  > Radio Workshop"* and *"Dwellings, the Quantum Core"* on the same principle — so this is neither
  > flagged nor substituted.

**Kept:** the Bell Tower, which stays here rather than in era five (see that guide), the Drawing
Office — *"the drawing made physical"* is §1's own statement of this era's signature move, so the
room where the drawing is made is the era-locked building, not a generic one — and the City Hall.
**Inert: no node on `tower` here either**, so the Bell Tower has nothing to attach to in this era
and the inherited tower keeps era one's look and era one's name. *(Noted 2026-07-29: the row marked
`store` as inert and left `tower` unmarked, though both are — §5 above already says "`store` and
`tower` carry no era-six node" in as many words. The asymmetry is the same one era four's row
carried and it has the same cause: the kept name was carried over rather than newly authored, so
the bullet that would have said so was never written. It matters more here than there, because this
Bell Tower is the surviving half of a resolved collision with era five's, and a reader checking that
the collision stayed resolved should also learn that nothing is drawn for the surviving name.)*

---

## The advisor (D-ERA28)

**Oru, dressed and speaking as an architect and surveyor.** The learner's companion for the whole of
Early Modern: he carries the mini-lesson, the check-your-understanding prompt and the hint
exactly as he does in era one — because he *is* era one's advisor, in this era's clothes and this
era's voice.

**Who she is — THE REGISTER, which is per-era and is meant to be — and the read that keeps the tone
right.** Not a court artist and not a patron: the person the city sends to *set the thing out* — who
has measured the site, drawn the elevation and will be there when the first course goes down. She is
the era's own idea of expertise, which is that a problem is solved on paper before anyone cuts
stone, and it makes her the right voice for a chapter about putting shapes on axes. Like Oru she
stands **beside** the learner's work rather than marking it.

**What she is wearing — THE DRESSING, out of this era's four materials and nothing else.** A plain
wool overgown in the **stucco** body hue over a darker underdress, sleeves pushed back and tied at
the elbow. A folded linen head-cloth rather than a jewelled coif — she works outdoors. At her belt,
a pair of **dividers** and a folded rule. She carries a **drawing board** the size of a forearm,
with a pinned sheet on it, and a **plumb line** hangs from its corner and swings when she moves; the
board is the counterpart of Oru's staff, a tool and not a badge. **Lead**-grey ribbon at the cuff
picks up the domes. No gold anywhere, and nothing that glitters.

### The four poses

Same four names as era one, which is the safe choice and needs saying rather than assuming: an
advance may **shrink** the pose vocabulary (D-ERA28), and every consumer maps its beat through a
total typed table, so an era that keeps the four cannot break a consumer. **This era adds none
and drops none.**

| Pose | The read | Where it is used |
| --- | --- | --- |
| **`idle`** | At rest. The board held at her side, the plumb line settling | The resting state; no lesson beat requests it directly |
| **`talk`** | Speaking. The board comes up, one hand open over the sheet | Every teaching line |
| **`point`** | Pointing at the work with the closed dividers | A correct answer, a hint, a retry |
| **`squint`** | Sighting along the plumb line, one eye closed | Reading the learner's work; authored and available |

**Still no celebration pose, and that is a chain decision rather than a per-era one.** Era one has
no `wave` and no `cheer` and the congratulation is carried by the reward chip and the mastery
star. Adding one here would make era six the first era where a correct answer is met by the
character rather than by the city, which is a change to the game's tone and not to this era's art.
Anyone who wants one should add it to era one first.

### Palette

The architect-and-surveyor dressing sits **inside** the era palette, which is what stops an advisor
reading as UI dropped onto the world: overgown in the warm-buff body hue `#C7A48E`, underdress a
deeper tone of the same, slate-grey `#596675` at the cuffs and on the dividers, linen just off the
`#ECE4D3` parchment ground. Skin and hair are the only notes outside the era palette, as with Oru.

> ## ⚑ THE NAME IS SUNSET — 2026-07-30, under `D-ET9`. THE DRESSING AND THE REGISTER ARE NOT
>
> **THE RULING (the team lead, recorded at `../../2026-07-29-era-trial-contract.md` §19.2),
> verbatim:** *"There is one continuous advisor for the whole run, re-themed per era. Not ten
> advisors."* This section was authored in good faith under the half of **D-ERA28** that has since
> been superseded — *"one advisor per era, belonging to that era"* — and it named era six's advisor
> **Vittoria, an architect and surveyor**. **The name `Vittoria` is retired.** Era six's advisor is
> **Oru**, dressed and speaking as an architect and surveyor.
>
> **EVERYTHING ELSE HERE SURVIVES, and the lead said so in terms:** *"the advisor's prose should
> change across eras though — it's not just a static advisor."* What is continuous is the name and
> the relationship with the learner; **the appearance and the voice are per-era and are meant to
> be.** So the wool overgown, the folded linen head-cloth, the dividers and rule, the drawing board
> and its plumb line, the four poses and this palette placement all stand exactly as authored — and
> so does the register above, *a problem solved on paper before anyone cuts stone*, which is this
> era's presentation of Oru rather than a second person's personality.
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
lesson sets its mathematics inside the era's world. This is the successor to the retired island
themes spec, and it is the section an author reads before writing prose.

**Three rules it inherits.**

1. **The framing comes from the era's WORLD, not from the node's BUILDING.** D-ERA8 forbids a
   building that symbolises its skill, so a lesson is set among the era's *work*, not inside a
   rebus. The Rotunda is not "the Pythagoras building".
2. **The "Explicitly absent" list in §2 is a hard boundary.** No structural iron, no machine-made
   brick, no soot, no reinforced concrete, no curtain wall. A word problem may not contain them.
3. **Theming follows the ERA, not the domain** (team lead, 2026-07-29). Three of these six nodes
   belong to domains whose other nodes sit in other eras. They are framed for Early Modern
   regardless.

**The era's context palette — six reusable settings, drawn from this guide's own props:** the
**drawing office** (paper, plates, dividers, a scale rule); the **building site** with its timber
model on a stand; the **surveyed piazza** with its bench marks and meridian line; the **cistern
and its depth-staff** — *(kept deliberately after `RAT.5` was re-authored as the cannon tower: rule 1
above makes a framing a fact about the era's WORLD and not about the node's building, and a
Renaissance city still stores and gauges its water whether or not a skill building is the tank. The
two framings that use it, `GEO.2`'s lining and `RAT.5`'s falling level, are unaffected and are not
rewritten. What would be wrong is the reverse — briefing the **art** for a cistern, which §5 no longer
authors.)*; the **print shop** and its identical copies; and the **dome under
construction**, courses closing over open air.

| Node | The mathematics | Early Modern framings (2 to 3 per node) |
| --- | --- | --- |
| **GEO.1** — Pythagoras, similar triangles, angle relationships | right triangles, similarity, angles on lines and in triangles | (1) **Setting out a right angle on the ground** with a knotted cord of 3-4-5, then checking a laid-out foundation by measuring its diagonal. (2) **A scale model and the building itself** are similar figures: the model is one-twentieth, so a measured part of the model gives the real one. (3) **Height by shadow** — the campanile's shadow and a staff's shadow at the same hour give two similar triangles. |
| **GEO.2** — area, perimeter, volume, surface area | standard plane and solid figures | (1) **Lead for a dome:** the sheet needed is a surface area, and the lead is bought by the sheet. (2) **Lining the cistern** — capacity is a volume, the lining is a surface area, and they are different questions about one tank. (3) **Paving the piazza:** area gives the number of slabs, perimeter gives the kerb, and a colonnade round three sides changes only one of them. |
| **CG.1** — coordinate plane, plotting, intercepts, distance, midpoint | points on axes, distance, midpoint | (1) **The surveyor's grid** laid over the piazza: a bench mark is the origin, ranging rods stand at plotted points, and a position is two measurements from one corner. (2) **Distance across ground you cannot walk** — two plotted points and the right triangle between them. (3) **The midpoint of a facade**, because this era centres everything: mark the centre of a front from its two ends. |
| **POL.6** — end behaviour from degree and leading coefficient | what a polynomial does far out | (1) **A drawn curve running off both edges of the sheet** — the draughtsman needs to know which way each end leaves before choosing the paper. (2) **A printed plate is a fixed window on a curve that continues**, so the question is what happens beyond the plate. (3) The **printer's terrace** runs the length of a street and its ends do different things at each end of the block. |
| **POL.7** — polynomial graphs: zeros, multiplicity, turning points | where a curve crosses, touches, turns | (1) **A curve pricked through onto a plate**, with the crossings marked: some cross the line, some only touch it and come back. (2) **A vault profile drawn and then corrected** — every turning point is where the draughtsman's hand changed direction, and they can be counted off the drawing. (3) **The lecture theatre's raked seating** in section is a run of rises and levels; a level row is where the rake turns. |
| **RAT.5** — rational graphs: domain, intercepts, holes, asymptotes | where the function is undefined, and what it approaches | (1) **The cistern's depth-staff:** as the tank is drawn down the level falls toward, and never reaches, the floor of the tank — an end-behaviour asymptote you can read off a graduated rod. (2) **A dose that cannot be measured** — a division the recipe forbids, marked on the staff as a reading the tank cannot show. (3) **Perspective's vanishing point** is this era's own idea of approaching without arriving, and it is worth using once: parallel lines converge at a point no part of the drawing occupies. |

**`RAT.5` needs one note an author must not miss.** Its lesson is **already written**
(`content/lessons/d5/RAT.5.json`) and it is framed **Medieval**, because it was authored while it
still sat in the Medieval era and while split-domain theming was an open question. Under the
2026-07-29 ruling it takes **Early Modern** theming and owes a re-theme. That work is Anthony's,
is tracked in `../../../Evan_Design_Decisions_Consolidated.md`, and is **not** a passing author's
to do. The framings above are what it should be re-themed *to*.

---

## 7. Props kit

§12 budgets a per-era props kit alongside the six masses, so that 62 buildings can be covered by
six types plus props. This era's kit:

- **The tally descendant**: **printed sheets** rolled and stacked, a rack of **engraved plates**,
  and a pinned-up engraved plan curling at its corners. The record is now multiplied rather than
  unique, which is why these come in bundles.
- **Instruments**: a **plane table on a tripod**, **surveying rods** bundled and stood against a
  wall, dividers and a long straightedge on a bench, a level, a plumb bob.
- **The model on a stand**: the finished building in miniature, at two sizes, with a plain
  trestle-and-drawing variant to stand beside it.
- **Time and measure in the ground**: a **sundial on a plinth**, a **bench mark cut into paving**
  with an arrow under it, a meridian line inlaid in a walk, a boundary stone.
- **Formal planting**: clipped hedging in short and long runs, **citrus in terracotta pots**,
  bay in tubs, topiary cones, a gravel walk with a raked edge.
- **Sitting and standing**: a **stone bench** with moulded ends, a balustrade run, a pedestal
  with nothing on it, a pair of steps up to a platform.
- **Signage, such as it is**: a **carved and painted armorial panel** set over a door or centred
  in a pediment, its device and colours doing the identifying, plus a smaller painted panel for
  lesser buildings. This is how a building gets identified in-world without a written name, and
  in this era it is composed into the elevation rather than hung off it.

---

## What is authored, and what this guide does not decide

Per §12. Footprints are identical in every era (INV-ERA-1) — see
`../era-01-prehistoric/style-guide.md` §6 for the table, and its §0 for the nine hard
constraints every era inherits.

- [x] **Materials** — §2. Pale dressed-stone bases and trim, warm buff lime plaster, localized
  hand-made red-brown brick, dark slate/sheet lead and glass at the size of an opening.
  Terracotta tile is NOT carried over from era four; terracotta stays only on small objects.
- [x] **Structural language** — §3. Enclosed masonry blocks, simple dark roof prisms and one
  building-specific large feature; the vocabulary is a silhouette menu rather than a trim list.
- [x] **Roof and support forms** — §3. The lead dome with its lantern, **lead-covered pitched
  roofs** behind it, and the segmental arch or flat lintel over openings.
- [x] **Palette** — proposed above (D-ERA27), awaiting Evan's review.
- [x] **Level of ornament** — §4. Low for direct Three.js recreation: broad profiles only, with
  no separately modelled masonry units, balusters, relief, molding teeth or repeated trim.
- [x] **Visible technology** — §4 and §6. At most three large props per plot; the canonical set
  uses one telescope, survey instrument, press or easel only where function needs it.
- [x] **The era's signature move** — §1. The drawing made physical, with era five's chalked slate
  becoming the printed page and the engraved plate.
- [x] **The three construction stages** — §6.
- [x] **The props kit** — §7.

- [x] **The subtitle row** — ratified above, seven proper nouns, ready to wire into
  `apps/web/src/city/eraDressing.ts`.
- [x] **The advisor** — above: **Oru dressed and spoken as an architect and surveyor**, with the
  four poses, the place in the palette and this era's register. *(Re-recorded 2026-07-30 under
  `D-ET9`, which retired the name `Vittoria`. Still complete: the dressing and the register are what
  this item was ever ticking off.)*
- [x] **Lesson framings** — above, all six nodes, with the era's context palette.
- [x] **The roster, corrected to six nodes** after #210, with Early Modern dressings written for
  the three arrivals and the orphaned Classical and Medieval descriptions retired.

**Closed on 2026-07-29, and how.**

- **Era one's §6 hall prediction was ALREADY corrected, and this item was stale when it was
  written.** It asked for *"a granary rotunda, then a basilica, then a domed hall, then a transit
  concourse"* to be fixed, because era four found the basilica taken by POL.3 and this era finds
  the domed hall taken by GEO.1. Era one's §6 was corrected on **2026-07-28** and now reads
  *"a granary rotunda, then a colonnaded tholos, then a domed rotunda, and finally a transit
  concourse"*, with a `CORRECTED` note beside it naming both collisions. The chain keeps its
  round plan the whole way, which is what both guides asked for. **Nothing is owed.** Kept as the
  record that it was raised twice and that era four's guide still carries the same stale ask.
- **Footprints for the six new nodes are decided**, since they are fixed forever once authored
  (INV-ERA-1) and leaving them unauthored is what was blocking the art. **All six take the square
  full plot (2×2), with one exception: `GEO.2`'s Drawing Office takes the long plot (2×1).** The
  reasoning is the one era one established by measurement — a plot's shape, not its size, is what
  a footprint controls. GEO.2 shares the workshop mass with the chain instance, and a long plot is
  the cleanest separation available: a north-lit drawing office wants a run of windows on one
  side, which is a long building, and it distinguishes the pair by plan rather than by scale. The
  other five separate by props and internal plan on a shared square plot, exactly as era four's
  basilica and **tholos** do. *(Corrected 2026-07-29 from "basilica and odeon": `POL.7`'s odeon is a
  **Early Modern** node — it is this era's own Lecture Theatre — so the pair to cite is the one era
  four still draws, and era four's own HISTORY banner says so. §5 above was corrected in the same
  class; this was the occurrence inside the closure block. The finding transfers unchanged, because
  the basilica/tholos pair separates on the same axis: a hall with a face against a hall you walk
  round.)*

**Both remaining items are CLOSED as of 2026-07-29.**

- **The two roster yards separate by PLAN, not by the tank, and the tank stays.** The objection
  was right: both are open paved ground inside an arcade, and §4's own rule is that a prop may not
  be the only thing separating two masses. So the separating axis is stated properly — **`CG.1`'s
  surveyed piazza is a public room you cross and `RAT.5`'s cistern court is a working enclosure
  you go into for one thing**: the piazza is open on at least one full side to the street with the
  arcade round the rest, the cistern court is arcaded on three sides with a single entrance, its
  ground falls to the tank, and its paving is channelled to feed it. **A difference in how you
  enter and where the ground drains survives zoom-out**, where a depth-staff does not. The tank
  and the staff stay as the props they are, no longer carrying the distinction on their own. **A
  dev-server look is owed as verification**, on the same footing as era one's `hall`/`tower` pair.

  > **⚑ THIS ITEM IS NOW MOOT, and it is kept rather than deleted because the closure was hard-won.**
  > `RAT.5` has been **re-authored as the cannon tower** in the consolidated rename pass, so the
  > cistern court this axis separated `CG.1` from no longer exists. **The pair is now flat ground
  > against a standing drum**, which is a silhouette difference: it survives zoom-out on its own, it
  > rests on no prop, and **the dev-server look this item owed is discharged with it** — there is
  > nothing left that a look at a specific zoom could decide, because the two buildings no longer
  > share a section. §5's yard entry states the new axis.
  >
  > **What survives and is worth keeping:** the rule the item was decided under. §4 forbids a prop as
  > the *sole* separator, and that rule is what forced a plan argument here rather than letting the
  > depth-staff carry the pair. It will force the same thing on the next pair, and the next pair may
  > not be lucky enough to have one of its members re-formed.

  > **CORRECTED 2026-07-29 — this axis was written against the wrong building.** It read *"**the
  > chain's piazza** is a public room you cross and the cistern court is a working enclosure…"*,
  > and **the chain's `yard` dressing in this era is not a piazza**: §5 authors it as *the
  > parterre court* — *"low clipped hedging in geometric beds with gravel walks between them, and
  > a sundial on a plinth"*. Hedging and gravel are not *"open paved ground inside an arcade"*,
  > which is the premise this item reasons from, so the sentence separated `RAT.5` from a building
  > that does not match its own description — and, under the re-dressing ruling, from one that is
  > never drawn either.
  >
  > **The pair that needs separating is `CG.1` against `RAT.5`** — two roster nodes on one mass,
  > which is what the head banner and `../README.md`'s eleven-pairs table both say era six holds
  > here — and the intended reading was almost certainly `CG.1` all along: the Lesson framings
  > below call that court *"the surveyed piazza"* in as many words. **The axis itself is sound and
  > is kept unchanged**; only the building it names moved. This is the same class of defect as era
  > three's `store` subtitle naming its sibling.
  > `output/imagegen/era-06-early-modern-building-briefs/README.md` identified it and applies the
  > axis to `CG.1` against `RAT.5`, which is what the art is being generated from.
  > **`../README.md`'s summary of this closure repeated the wording and is corrected with it.**
- **The CHAIN rotunda carries the through-line, per the folder's own convention.** `../README.md`
  states it in as many words — the inherited instance always carries it — and this item was
  recording that convention rather than needing a new decision. The reason it was left open was
  that era one's prediction had just been re-pointed at the round plan; **re-pointing is not what
  this asks for.** Applying a rule the folder already publishes leaves the chain's history exactly
  as legible as the re-point made it: era one's cone, era two's drum, era three's corbelled drum,
  era four's tholos, era five's polygon, **this era's domed rotunda**, and on to the concourse.
  `GEO.1`'s square-plan domed hall is the roster instance and carries nothing.

---

## Related

- `civic-buildings.md` — the bought buildings for this era, which carry a large share of its
  visual identity, and the food, livability and happiness values this file does not carry.
  *(Corrected 2026-07-29 from "an unusually large share", which rested on the pre-#210 roster of
  three skill buildings. This era adds six, so the share is ordinary rather than unusual — see
  that file's own note at §2.)*
- `../README.md` — the ten eras, the two-file convention, and what each guide owes.
- `../era-01-prehistoric/style-guide.md` — §0's nine hard constraints, §6's frozen footprints and
  the seven through-lines this guide inherits, and the §6 hall prediction it asks to have fixed.
- `../../2026-07-27-era-progression-design.md` — §3 the ten eras and this era's pairing with
  Geometry, §6.1 the six ordinary types, §12 the art budget and D-ERA20/21.
- `../../City_Art_Bible.md` — the palette, the three-tone lighting model, the silhouette system
  and the accessibility rules this guide sits inside.
- `../../../../Game_Visual_Design_Brief.md` — the tone bans (no scarcity, no guilt framing).
- `../../../../Node_Spine_v4.md` — the lesson titles quoted verbatim in the roster.

---

## Image inspiration

Drop reference images straight into this folder. Worth gathering: rusticated stone bases with
smooth upper storeys, arcaded loggias, domes and drums, campanili, symmetrical palazzo façades,
quoins and pilasters, and surveying instruments.
