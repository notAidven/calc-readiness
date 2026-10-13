# Era 09 — Information Age building briefs

Image-generation briefs for the eleven buildings era nine owes: **six skill buildings**, **the
hub**, and **four civic buildings**. Written with the `era-building-briefs` project skill from
the era's own two documents, and from nothing else:

- `docs/superpowers/specs/eras/era-09-information/style-guide.md`
- `docs/superpowers/specs/eras/era-09-information/civic-buildings.md`
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0, for the hard constraints
  every era inherits

**Eras one through eight are not briefed here and are not owed.** Since the 2026-07-29
re-dressing ruling a skill building is drawn once and keeps that look for the whole run, so no
later era re-dresses an earlier one's buildings. Era nine's guide describes the seven masses it
**inherits** under a REFERENCE ONLY banner; none of those seven is drawn here. The only building
that rethemes every era is the hub.

**But an era-nine island still has all of them standing on it**, which is why the confusion sets
below reach outside this era. Forty-seven buildings from eras one to eight stand when era nine's
six go up, each in its own era's clothes. See **The cumulative confusion set**.

---

## Verified at the tip before writing

Read at `3c08291`, then **re-checked at `29ae68c`**, which is where `integration` had moved by the
time this was finished. Every name below comes from the files at run time, and every claim in this
section was checked against the source rather than carried in.

> **What moved while this was being written, and what it does to the findings.** Four PRs landed —
> era two's name rulings (`#256`) and the era four, five and six briefs (`#257`, `#258`, `#259`) —
> touching `eras/README.md`, era two's two documents and three files under `output/imagegen/`.
> **Neither of era nine's documents changed, and neither did era eight's**, so the briefs below are
> unaffected. **Every claim this document takes from `eras/README.md` was re-read at `29ae68c`** and
> all of them hold: era ten's `workshop` is still **Drone Command · Robotics Lab**, era seven's is still
> **Locomotive Shop · Cannon Factory**, era eight's still **Wind Tunnel · Electronics Works**, era
> nine's still **Chip Factory** and still named there as one of three rows that announce a recorded
> chain break, the *-plant judgement still pairs era eight's Heating Plant against era ten's Chip
> Plant, and *The Apartment Tower* is still the only *Tower* in the bought column. **The one change
> in that file that reaches era nine's neighbours is era two's `tower` cell**, ruled from held-at-
> *Grain Silo* to locked at **the Stone Tower**; nothing in this document depends on it.

| What | Found |
| --- | --- |
| **The node set** | `ERA_SEQUENCE`'s `information_age` entry holds `["EL.1","EL.2","EL.3","EL.4","EL.5","EL.6"]` (`packages/skill-graph/src/eras.ts`). The guide's roster is the same six in the same order. **No disagreement.** |
| **The material id** | `silicon`, renamed from `compute_cycles` on 2026-07-29 and shipped in `#233`. The guide is current; nothing still says `compute_cycles`. |
| **The hospital** | **Confirmed present**, moved from Early Modern on 2026-07-29. It holds the **blend** row — 1×2, 2,560 livability + 2,560 happiness, 30,720 silicon. The slot was *The Clinic*. Era six took *The Painters' School* in exchange, at identical numbers. |
| **The two "… Tower" names** | **Resolved, and it stayed resolved.** The skill `tower` dressing is **the Office Tower** (kept, the lead named it); the civic housing is **The Condominium**, renamed from *The Residential Tower*. Era nine now holds exactly one *Tower*. |
| **Footprints** | All six of era nine's nodes resolve to `DEFAULT_FOOTPRINT` **2×2** — `NODE_FOOTPRINTS` in `apps/web/src/city/worldLayout.ts` holds only the six `NUM.*` ids and `town-hall`, so `footprintFor` falls through for every `EL.*`. The hub is **3×2**. Civic plots are the catalogue's. |
| **The subtitle row** | Ratified in the guide, **not wired**. `ERA_DRESSINGS` in `apps/web/src/city/eraDressing.ts` holds one era key, `prehistoric`. Era nine degrades to the stable name alone today, which is the designed behaviour. |
| **Stable names** | `D1_NODE_BUILDINGS` in `apps/web/src/city/buildingAssets.ts` — `hall` Assembly Hall, `store` **Store**, `dwelling` Dwellings, `workshop` Workshop, `yard` Commons, `tower` Tower, hub Civic Center. These are what precede every subtitle in the announced name. |

### The roster, as the files give it

| Node | Mass | Plot | What the guide authors | Dressing in the files |
| --- | --- | --- | --- | --- |
| `EL.1` | `hall` | 2×2 | A server hall: a blank clad box, a louvred plant wall, chillers ranked on the roof | **the Data Centre** |
| `EL.2` | `tower` | 2×2 | An office tower, glass curtain wall on a stone-clad podium, a lit crown at the parapet | **the Office Tower** |
| `EL.3` | `workshop` | 2×2 | A fabrication lab, windowless clean-room block with an airlock entrance and a gas store beside it | **the Chip Factory** |
| `EL.4` | `store` | 2×2 | **RE-AUTHORED 2026-07-30 — a research lab**: a blind two-storey bar of identical lab bays under a comb of slim extract stacks, a lower wholly glazed write-up range along its front, nothing else on the plot. *(Was: "a logistics store: a tilt-slab shed, dock doors in a long rhythm, trailers on the apron.")* | **the Research Lab** |
| `EL.5` | `dwelling` | 2×2 | A residential block, balconied slab in composite cladding over a glazed retail base | **the Glass Apartments** |
| `EL.6` | `yard` | 2×2 | A dish yard: satellite dishes on concrete pads behind a mesh fence, a small equipment cabin | **the Air Force Base** |
| — | `town-hall` | 3×2 | A long clad block behind a civic frontage, rooftop chillers ranked along the parapet, a shimmer of warm air above them | **the Headquarters** |

**The trap class this folder is known for — node ids crossed against their masses — is CLEAN in
era nine, and it was measured rather than assumed.** Era two had three of five crossed. Era
nine's roster table, its masses section and its subtitle row were read against each other on
every one of the sixteen places a node id appears in the two files. All sixteen agree: `EL.1`
`hall`, `EL.2` `tower`, `EL.3` `workshop`, `EL.4` `store`, `EL.5` `dwelling`, `EL.6` `yard`,
with the same building attached each time. **No disagreement to report.** Recorded because a
clean result is the finding when the check is the point.

---

## The four renames — a verdict on each, all four now MERGED

**All four are the lead's, and when this was written none was in the files.** *(That state is over —
see the banner below.)* Name changes were
> ## ✅ ALL FOUR ARE MERGED, AND ONE OF THEM BROUGHT A RE-AUTHOR AND A FIFTH CHANGE WITH IT
>
> **The consolidated pass has landed.** `EL.3` is **the Chip Factory**, `EL.4` is **the Research
> Lab**, `EL.5` is **the Glass Apartments** and the civic food row is **The Distribution Center**,
> all live in `docs/superpowers/specs/eras/era-09-information/`. **This document's verdicts are
> overruled rather than answered** — the lead read them and kept the names — and each guide cell
> records the objection it is overruling in place, so nothing is lost.
>
> **`EL.5` came with a second ruling and it is the important half: *keep the name and re-author the
> description to actually be glassy.*** §5 now authors a slab wrapped corner to corner in a unitised
> glass curtain wall with its balconies **recessed inside** the glass line, over a glazed retail
> base — where the files had composite cladding with balconies proud of the wall. **The era loses one
> of its four materials on this building and gains its signature on its housing.** Brief #5 is
> re-authored.
>
> **The three-Factory run this document reported is GONE, and not by anything era nine did.** Era
> seven's `FUN.8` is now the **Cannon Factory** and era eight's `LF.2` is the **Electronics Works**,
> so **era nine's Chip Factory is the only *Factory* left in the run.** Era ten's `workshop` also
> stopped being *the Chip Plant*, so *Chip* now appears once rather than twice.
>
> **⛑ AND `EL.6` IS NO LONGER THE SATELLITE YARD.** It is **the Air Force Base**, era nine's entry
> in a defence lineage running one building per era from era three onward — a form change this
> document was never briefed on. The dishes survive on its apron. The guide's §5 yard entry is the
> authority, and it also carries the correction to *"nine eras and this plot has still never
> risen"*, which the lead's era-eight ruling falsified.

batched into one consolidated pass, so this document used each new name flagged as **PENDING**
with the current file name beside it, exactly as the skill's Step 3 requires. Nothing in the
briefs below depends on a name: every building is authored and drawable as the files have it.

**Each verdict is against the building's own authored form and its mass handle**, because the
announced name is built as *stable name, then subtitle* — `Store, the Research Lab` — so a
subtitle has to survive being heard after its handle.

| # | Rename | Verdict |
| --- | --- | --- |
| 1 | Chip Factory → **Chip Factory** | **REJECT.** The form fits and everything else does not. |
| 2 | Research Lab → **Research Lab** | **REJECT, and it is the worst of the four.** |
| 3 | Glass Apartments → **Glass Apartments** | **REJECT.** Both objections hold, and a third is worse. |
| 4 | The Distribution Center → **The Distribution Center** | **REJECT.** This era's own files already refused this name. |

### 1. Chip Factory → Chip Factory — REJECT

**The authored form supports it and nothing else does.** `EL.3` is *"a fabrication lab,
windowless clean-room block with an airlock entrance and a gas store beside it"*, on a plinth of
engineered stone with a display panel by the door. A semiconductor fab is exactly that building —
airlock, no windows, bulk gas beside it — so unlike rename 2 this one is not a mismatch with the
art. **The accessible name is also fine:** `Workshop, the Chip Factory` is mildly redundant and
not contradictory, since a fab is a place things are made.

**Four objections, and the second is fatal on its own.**

**~~The three-Factory run is real, and the pending set makes it three consecutive.~~ GONE — era nine
holds the run's only *Factory* now.** *(Kept as the record of a real objection that was resolved by
the other two eras moving. The reasoning below is history.)* The files
today read era seven `workshop` **the Cannon Factory** (`FUN.8`) and era eight `workshop` **the
Instrument Works** (`LF.2`); the lead has separately renamed those to **Machine Factory** and
**Instrument Factory**, both pending. Under the freeze all three eras stand on the island at
once, so the `workshop` column would run *… Cannon Factory · Electronics Works · Chip Factory*
across eras seven, eight and nine. **Judged: yes, too repetitive.** The folder's own rule is that
*a repeated head noun is not the defect, synonymous qualifiers are* — and *machine*, *instrument*
and *chip* are three genuinely different things, so the run survives that test on paper. What it
fails is the test the same pass was actually run for: the lead found the naming defects **by
reading all 102 names down a column at once**, and the objection to *Long Store · Raised Store ·
Goods Store* was that they *blur into each other down the column*. Three consecutive *Factory*
names blur the same way, and they would be the only three-in-a-row of anything in the table.

**Era ten's `workshop` is already Drone Command, and that is decisive.** `TRG.2` is dressed
*"a fab shop, windowless clad box with an airlock and an exhaust stack"* and its subtitle is **the
Drone Command**. So era nine's fab would stand one era from era ten's fab, both permanent, and the
two names would be **Chip Factory** and **Drone Command** — an *identical* qualifier under a
*synonymous* head noun. That is strictly worse than the pair the folder renamed for exactly this
reason: *Residential Tower* / *Apartment Tower* shared a noun and had synonymous qualifiers, and
here the qualifier is not synonymous but the same word. The folder has already noticed half of
this and drawn the wrong conclusion from it: it judges *-plant* close-but-acceptable by pairing
era eight's **Heating Plant** against era ten's **Drone Command** — *"two eras apart, a boiler house
against a semiconductor fab"* — which is a defensible call about *Plant*, and it silently assumes
era nine holds no fab of its own. Renaming era nine's clean room to *Chip Factory* would put two
semiconductor fabs in adjacent eras carrying the same qualifier, and the one-namespace check
would not catch it because the strings differ.

**"Chip" is ambiguous in ordinary English, and the game itself is one of the ambiguities.** A
learner meets *chip* as a fried potato, a wood chip, a poker chip, a paint chip and a chipped
tooth long before a die of silicon, and the naming rule's test is *the thing the name points at*
rather than the etymology — the same test that failed *drying racks*, four plain words pointing at
nothing recognisable. Worse, **the product already uses the word**: era nine's own advisor section
says the congratulation *"is carried by the reward chip and the mastery star"*, and the same phrase
is in era one's guide and in the folder README's advisor rules. So *Chip Factory* would read to a
learner as the building that manufactures their rewards.

**And it discards a name the guide says is load-bearing.** The subtitle row keeps *the Chip Factory*
on stated grounds: *"which is not generic and is doing real work: `../README.md` records three
genuine chain breaks and this names one out loud, because a sealed laboratory is the one thing an
open working floor cannot become."* The folder README repeats it — three rows name a recorded
chain break out loud, and this is one of the three. *Chip Factory* names a product; *Chip Factory*
names the sealed condition that broke the workshop chain, which is the single most important
finding in era nine's masses section. **If the lead wants a change anyway**, the cheapest name
that keeps all four objections satisfied is one built on the *sealed* condition rather than on the
product — but the recommendation is to keep *the Chip Factory*.

### 2. Research Lab → Research Lab — REJECT

**The new name describes a different building, and this is the defect the folder rates as worse
than a generic name.** Establish the mass and the authored form first. `EL.4` sits on **`store`**,
plot 2×2, and the roster authors it as *"a logistics store: a tilt-slab shed, dock doors in a long
rhythm, trailers on the apron."* The masses section is blunter still: *"EL.4's logistics store is
the same mass with the glazing left out: dock doors in a long rhythm, trailers on the apron,
**nothing to see into**."* That is a shed with a dock face and a vehicle yard. **A research lab is
an institution** — offices, write-up space, plant, a reception — and it has no dock rhythm and no
trailer apron. **The new name does not describe the authored form on any axis: not the silhouette,
not the aperture, not the props, not the use.**

**The accessible name contradicts itself, as predicted.** The stable name for `store` is
**`Store`** (verified in `buildingAssets.ts`), so the building would announce as **"Store, the
Research Lab"** — a handle saying *this is where things are kept* followed by a subtitle saying
*this is where things are investigated*. This is the same defect class as era eight's hub, which
was ruled on and renamed for announcing *"Civic Center, the Civic Centre"*; that one was the
handle repeated back, and this one is the handle contradicted.

**It also lands the lab identity on the wrong building.** Era nine's actual laboratory is `EL.3`
on `workshop` — the clean-room fab. Putting *Research Lab* on the store would give the era two
lab names, one on the building that is a laboratory and one on the building that is a shed; and if
rename 1 also landed, the era would read *Chip Factory* for the lab and *Research Lab* for the
warehouse, which is the two names swapped onto each other's buildings. Era ten's `workshop` also
holds **the Robotics Lab**, so *Lab* is spoken for one era along.

**And the name it would replace is one the guide reasoned for.** The subtitle row records
*Research Lab* as chosen against *Distribution Centre* precisely because it names the operation the
dock rhythm and the trailers depict. **Recommendation: keep *the Research Lab*.** If the lead
wants the lab, the building to hang it on is `EL.3`.

> ## ⚡ ANSWERED 2026-07-30 — the lead has moved the BUILDING, which is the one outcome this section
> did not cost out
>
> **Everything above is kept and none of it is withdrawn**, because the objection it makes is the
> one the ruling accepts: the name did describe a different building from the one the files
> authored. **What it got wrong was the remedy.** It offered two — keep the name over the shed, or
> move the name to `EL.3` — and the lead has taken a third: **re-author `EL.4` to be a laboratory,
> and solve the pair separation rather than avoid it.**
>
> **The objection this section rated highest survives and is answered on its own terms.** *"A second
> laboratory in one era would leave nothing between them"* was correct as long as the only proposed
> difference was a name. It is not correct once the difference is structural: **`EL.3` is a fab
> and `EL.4` is an experiment**, which comes out as one sealed envelope against a counted rank of
> serviced cells, one exhaust against a stack per bay, blind against occupied, and bulk gas on a
> bunded pad against an empty plot. `era-09-information/style-guide.md` §5 tabulates all five and
> marks the two that are silhouette.
>
> **The accessible-name objection stands and is not reopened** — the building still announces as
> *"Store, the Research Lab"* — but it is now a handle disagreeing with an accurate subtitle rather
> than with an inaccurate one, which is the milder version of the same defect and is the version
> the lead accepted for era eight's *"Store, the Radio Workshop"*.
>
> **One of this document's own findings is retired by the change, in the good direction.** Brief #4
> called `EL.4` against the civic **Distribution Center** *"the era's sharpest confusion"*, held
> apart by a glazed office corner and a solar array that both had to be present. **Neither is
> load-bearing any more.** Brief #4 below carries the new form.

### 3. Glass Apartments → Glass Apartments — REJECT

**Glass is era nine's default body material, so naming one building for it is the mud-brick
problem exactly.** §2's materials table gives *"Unitised curtain-wall glass"* as **"The body
material"** in as many words, and the palette entry goes further: body hue anodised grey-blue
`#96A1AB` with the accent *curtain-wall glass* `#7FA0A8`, sitting close together on purpose
because *"this is the era where buildings stop having a body colour distinct from their
glazing."* Every era-nine building is glass and panel; a *Glass* qualifier therefore carries no
information and is the weak-adjective shape the naming pass was run to remove.

**Worse, `EL.5` is the one era-nine building whose body is explicitly NOT glass.** The roster
authors it as *"a balconied slab in **composite cladding** over a glazed retail base"* — the glass
is the two-storey base, and the slab above it, which is the whole silhouette, is opaque rainscreen
panel. So the rename would name the era's default material after the single building that departs
from it, and name it after the smallest part of that building.

**Era nine already holds a second apartment building, and it is the civic housing row.** The
livability civic is **The Condominium** — 1×1, 5,120 livability, 23,040 silicon, *"fifteen storeys
of composite cladding in two tones, projecting balconies on alternating floors, a double-height
glazed lobby"*. A condominium is an apartment building, so *Glass Apartments* beside *The
Condominium* is two apartment names in one era, on two buildings that are both balconied
composite-clad slabs. **Both of the checks asked for come back positive.**

**And a third objection is worse than either, because the files already ruled it out by name.**
The Condominium's rename banner enumerates the words that were unavailable to it: *"the word had
to go entirely — which also rules out **Apartment**, **Flats** (this era's own skill dwelling is
the Glass Apartments), **Block** (era eight's skill dwelling is the Housing Blocks) and **Homes** (era
ten's bought housing is the Capsule Homes)."* The reason *Apartment* was unavailable is that **era
eight's bought housing is The Apartment Tower**, frozen in era eight and standing in the same city
forever. So *Glass Apartments* walks into the collision that the era's most recent naming decision
was made to avoid, from the other side. The ruling that produced *Condominium* would have to be
reopened to accept it.

**Recommendation: keep *the Glass Apartments*.** The guide's own reasoning for it is the strongest of
the seven: *"`EL.5` is a balconied slab over a glazed retail base with its shared yard become a
private garden **on the podium**, reachable only from the flats above, so the podium is both the
form and the social fact."* The podium is also the axis this building separates from four earlier
housing buildings on — see **The five-deep housing lineage** below — so the name is carrying the
distinctness argument as well as the era.

### 4. The Distribution Center → The Distribution Center — REJECT

**Which row it occupies, and what it provides: the FOOD row.** The catalogue's first row is *The
Food Warehouse* · 2×2 · **food for ~5,120** · 20,480 silicon · wins on resource efficiency · loses
because *"it is a shed with a logo; contributes nothing to the skyline."* Every era's catalogue
carries the same four roles — food, housing, happiness, blend — and this is era nine's food.
**"Distribution Center" does not say food.**

**The era's own files considered this exact name and refused it, twice over.** The subtitle row
records: *"**the Research Lab** for the Distribution Centre. **Distribution** is the era's
euphemism for nothing in particular, and it would also have made a second **Centre** in one era
beside the Data Centre."* So era nine has already judged the word *distribution* as naming
nothing, and has already counted the second *Centre*. Applying the rename would reintroduce the
refused name in the same era, against the same *Data Centre*, and would additionally collide with
the building the refusal was made in favour of: `EL.4` **the Research Lab** is era nine's
distribution building.

**The two buildings are already near-identical, and the name is the only thing separating them.**
The civic is *"a tilt-slab shed with a long dock face, trailers on the apron, a small glazed office
corner, roof plant and solar array"*; `EL.4` is *"a tilt-slab shed, dock doors in a long rhythm,
trailers on the apron."* That is the same sentence twice. Today a player reads *Food* Warehouse
against *Parcel* Depot and knows which is which. Rename the civic to *Distribution Center* and the
two names describe one operation while the art describes one building — **the name would stop
being the separator and start being a second source of confusion.**

**Also: the spelling is inconsistent with the era.** The files write *Centre* (the Data Centre; the
refused Distribution Centre) while the stable hub name is the American *Civic Center*. The proposed
rename is spelled *Center*. Reported, not fixed.

**Can the food row carry a logistics name and still read? No — and this is the second time the
question has come up.** Era seven's food civic is **The Cold Store** (2×2, food for ~1,280) and is
pending a rename to *The Railway Depot*, which is the same move. Read the food column down all ten
eras as the lead reads it:

| 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Smokehouse | The Granary | The Terraced Fields | The Grain Dock | The Great Barn | The Covered Market | The Cold Store | The Supermarket | The Distribution Center | The Vertical Farm |

**Every one of the ten names points at food** — smoking it, storing grain, growing it, landing it,
barning it, selling it, keeping it cold, a supermarket, a farm. Two logistics renames would make
eras seven and nine the only two rows in the run whose names point at **freight**, and they would
be adjacent-but-one in a city holding both. The mechanical reason it matters: the folder's naming
rule states that a **civic name stands alone with nothing in front of it**, unlike a subtitle which
is always preceded by its stable name — so a civic name is the whole of what a buy menu says. And
the rule's own corollary is that *"a name that points at a **different** mechanic than its row is
worse than a vague one"*, established when era one's blend was called *The Storage Pit* and
promised the food row's job. *Distribution Center* and *Railway Depot* both point at moving goods,
which is a different mechanic from feeding a population, so both fail the corollary rather than
merely being dull. **A contribution number does render in the DOM** (era one's civic §6, inherited
here), so nothing is *unlearnable* — but the number is what a player checks after the name has
already told them what to look at.

---

## The theme brief

*Read once. Every building below inherits all of it, and none of them restates it.*

Era nine is **a sealed, quiet town of glass and panel, with all of its machinery buried and
nothing on any wall to say how it was made.** The signature move is **the sealed reflective
skin**: no visible joint that is not part of a grid, no visible service, no visible structure, so
a building becomes a surface — a continuous plane of glass and panel drawn tight over a frame
nobody sees, meeting the ground with a shadow gap rather than a base. **This is the first era
whose buildings do not explain themselves**; era eight hid its frame but still showed a slab edge
and a board mark, and era nine shows a reflection of the sky and the next building along. **Four
materials:** unitised curtain-wall glass as the body, flat and faintly cool, arriving as
storey-high units with a fine mullion and transom grid and a spandrel panel at each floor, and
that grid is the only texture the era has — it must stay regular, because an irregular one reads
as an earlier era; anodised and composite rainscreen panel, matte, close-toned and seamless at a
distance, its narrow open joints set out deliberately rather than tiled at random; exposed
structural steel, slender and pale, **only where it is being expressed** — a canopy, an atrium
screen, a mast — since steel that looks structural by accident belongs to era seven; and
engineered stone cladding, dry and pale and precise, on podiums and retaining faces in large thin
panels with tight joints, the era's one nod to weight and always a facing rather than a wall.
**Buildings stand up somewhere you cannot see:** the frame is behind the skin and nothing about
the load path reaches the outside, so the vocabulary is the unitised grid wrapping every face
including the ones nobody would have bothered with — **there is no back** — podium and tower with
a wide clad base holding the ground and the taller element ignoring it, the clear span with its
plant hidden in the depth above the soffit, the shadow gap at ground and parapet so a building
reads as a wrapped object rather than as something resting on anything, rooftop plant as the only
thing breaking a flat top edge and therefore the whole of an era-nine roof profile, and ramps
rather than steps wherever the ground changes. **Ornament level is zero, and unlike era eight the
zero is an assumption rather than a statement** — era eight was proud of having none, era nine
simply does not have the category: what patterns a face is the panel joint and the glazing grid,
what interrupts it is the signage band and the entrance, and that is the entire vocabulary, with
signage carrying what an earlier era's ornament carried. **One body hue for the whole era —
anodised grey-blue `#96A1AB`** — with curtain-wall glass `#7FA0A8` as the accent, sitting on the
calm parchment ground `#ECE4D3` rather than competing with it; body and accent sit close together
on purpose because this is the era where buildings stop having a body colour distinct from their
glazing, **so silhouette has to do almost all the work here.** The era's tally descendant is **the
display panel** — a small illuminated matrix panel by a door, on a totem, above a counter, showing
a number that changes — which is era one's own predicted fourth and last step, nine eras after the
first notch was cut, and it should be treated as a scheduled arrival rather than an invention.
**Absent on purpose, because each is era ten's signature move:** emissive surface used as a whole
face, exposed conduit and cable tray run across an elevation, and the deck carried over the older
ground. **And the era's real absence is not a material at all: visible hand-work of any kind.**
Nothing shows that a person made it — no board mark, no tooled stone, no laid course, no lashing,
no rivet, no brush stroke; every surface arrives finished from somewhere else and is fixed by a
bracket you cannot see. Eight eras of buildings carried the evidence of their own making on the
outside, and this is the era that stops.

### Constraints that bind every image below

- **Three tone steps per surface under one key light** — top face lightened, the hue on the left,
  the right darkened. **No runtime lights**: no cast shadow, no ambient occlusion, no specular
  highlight, no rim light, no gradient. Never describe a building by light falling on it. **This
  era makes that hard on purpose** and it is worth reading twice: the signature move is a
  *reflective* skin, and a reflection here is a **material read** — flat, faintly cool,
  weakly mirroring — never a highlight and never a gradient.
- **Emitted light is an emissive surface inside that model, never a light added to the scene.** A
  back-lit signage band, `EL.2`'s lit crown and every display panel are bright **in themselves**
  and light nothing around them. No glow on a panel, no pool on the paving. Era nine has more
  emissive surface than any era so far, so this is the constraint most at risk here. **Whether a
  lit surface sits convincingly beside a face that is only tonally shaded is the one item left
  open across all ten era folders** — Evan's, on the dev server. The decidable half is decided and
  is not negotiable: emissive surface inside the three-tone model, never a scene light.
- **Footprints are frozen** (INV-ERA-1). Design to the plot named in each brief; never change
  which cells a building occupies. **All six of era nine's skill plots are 2×2**, which is a
  constraint in its own right — see the note under the building table.
- **Height is a ranking, never a world-unit target.** A model is contain-fit to its plot by one
  uniform scale, so the more slender of two neighbours is simply the taller one, and a smaller
  plot shrinks a model whole rather than making it look tall. **Slenderness is a property of the
  model, not of the plot.** The 24-unit ceiling is a cap that silently squashes anything taller,
  not a target.
- **Every building is modelled at its finished (`built`) stage.** Not the site stage, not
  construction, and not a mastery variant — mastery rides above a building as stars.
- **Mastery gold `#FFB703` is reserved.** It may never be a material and a body is never gold.
- **Every side must read.** The camera orbits a full 360° at a locked ~49° tilt, so there is no
  front and no hidden back. **The era states this itself** as the unitised grid wrapping the faces
  nobody would have bothered with, so it costs era nine less than it costs any earlier era — but
  it is what forbids putting all the signage on one elevation.
- **No rebuses.** A skill building is ordinary architecture that happens to house a lesson and
  never symbolises it. **This bites hardest here of anywhere in the run**, because exponential
  growth is the era's mathematical read and the *city itself* already expresses it — population in
  the tens of thousands, resources compounding by `2^(N-1)`. **The graph is the save file, not the
  façade.** So: no logarithmic sweep on an elevation, no curve etched into a spandrel, no parapet
  that doubles at each bay, and no display panel showing a building's own lesson. A display panel
  shows a number that changes; it never shows a graph.

---

## The eleven buildings

| # | Building | Class | Node / role | Plot |
| --- | --- | --- | --- | --- |
| 1 | the Data Centre | skill | `EL.1`, `hall` | 2×2 |
| 2 | the Office Tower | skill | `EL.2`, `tower` | 2×2 |
| 3 | **the Chip Factory** *(merged; until the pass the files read “the Clean Room”)* | skill | `EL.3`, `workshop` | 2×2 |
| 4 | **the Research Lab** *(re-authored 2026-07-30; until then a logistics shed, and until the pass the files read “the Parcel Depot”)* | skill | `EL.4`, `store` | 2×2 |
| 5 | **the Glass Apartments** *(merged; until the pass the files read “the Podium Flats”)* | skill | `EL.5`, `dwelling` | 2×2 |
| 6 | the Air Force Base | skill | `EL.6`, `yard` | 2×2 |
| 7 | the Headquarters | hub | `town-hall` | 3×2 |
| 8 | **The Distribution Center** *(merged; until the pass the files read “The Food Warehouse”)* | civic | food | 2×2 |
| 9 | The Condominium | civic | livability | 1×1 |
| 10 | The Roof Garden | civic | happiness | 3×2 |
| 11 | The Hospital | civic | blend | 1×2 |

**Every name above was REJECTED by this document's verdicts, and the lead kept all four anyway.**
*(That is his call and the guides record each objection at the cell it belongs to. The sentence
below is kept as written.)* Each is carried only so an
artist can match the brief to whatever the files say when they read it.** The body of each brief
describes the building the files author, which is the only thing that is safe: a brief may not
re-design a building to fit a proposed name, and the folder records that a subtitle naming a
different building from its roster *"is a worse defect than a generic name because it sends the
modeller the wrong way."*

**All six skill plots being 2×2 is a design fact, not a placeholder.** Era nine is the only era
whose six new buildings share one plot shape, so **the plot does none of the differentiating work
here** — no long strip to make a shed read long, no single tile to make a lab read small. Aspect
ratio has to come from the models, and the guide says so: the extremes *"belong to the models
rather than to the plots"*. Practically, `EL.4` must be authored long and low and `EL.6` flat
against an `EL.2` authored tall and narrow, and each will then contain-fit the same square plot to
a different height. **Do not reach for a plot to fix a proportion.**

### The height order

Era nine's own eleven, tallest first. **This is a ranking within the era and not a scale.**

**Skill and hub**, from §3 with the two inherited entries removed since they are not built: **the
Office Tower**, clear of everything else era nine builds on the skill side; then **the Glass
Apartments** and **the Headquarters**, effectively level with one another — *"the hall stays out of
the top two, as it has since era eight"*; then **the Data Centre**, the Headquarters' smaller
cousin; then **the Chip Factory**; then **the Research Lab**; and **the Air Force Base** lowest,
the lowest plot on the island for the ninth era running. **The era climbs one more step on era
eight and the movement is all in the podium** — everything now stands on structure, so the base of
each building starts higher than the ground it covers.

**Civic**, from the civic file's own figures: **The Condominium** (~22 units) is the tallest thing
era nine builds anywhere; then **The Hospital** (~18); then **The Roof Garden**'s trees (~11) over
its podium (~6); and **The Distribution Center** (~10). *Two contradictions are reported under
**Defects** rather than reconciled here: the civic file gives unit figures where the style guide
forbids them, and §3's claim that "nothing here reaches the 24-unit ceiling" does not survive a
22-unit Condominium.*

---

### 1. the Data Centre — `EL.1`, `hall` mass

**Plot: 2×2 (8×8u).**

**Silhouette.** **A blank box with a ranked row of drums on top of it.** One clad volume with no
opening you can read at distance, and a rank of rooftop chillers standing proud of a flat parapet
— the plant *is* the silhouette, and without it this building has none. One dominant shape, one
accent: the box, and the rank.

**How it stands up.** Frame behind skin, entirely hidden. A sealed composite rainscreen wrapped
over every face on a deliberate open-joint pattern, held clear of the ground by a shadow gap so
the box reads as a wrapped object standing on nothing. One face is not panel but a **louvred plant
wall**, floor to parapet, which is the only modulation the elevation gets. Flat roof behind an
upstand.

**Materials and ornament.** Composite panel almost throughout, with **no curtain-wall glass at
all** — this is the era's one building with no glazing worth the name, and the departure is the
point. Aluminium louvre for the plant wall. Engineered stone only where the ground is retained. A
back-lit signage band on the entrance elevation, and a display panel recessed beside the one door.

**The detail that has to read: the louvred plant wall against the panel.** A full-height field of
fine horizontal louvre reading as a **grain** change against the flat panel either side of it,
legible at zoom-out as a striped panel in an unstriped wall. It is what stops this being a plain
box, and it is the only thing on the building that says what is inside.

**Props.** A wayfinding totem at the plot edge. Flush duct and fibre markers set into the paving.
A clad enclosure with a hinged lid at the service end. No planting, no seating, no cycle dock —
nobody comes here, and the absence of people-props is a real read.

**Height.** Below the Headquarters, above the Chip Factory. Wide rather than tall.

**What it must not resemble.** **The Headquarters (#7), which is technically its larger cousin and
is the same idea with a public face on it.** They separate on **frontage and props, never on
geometry**: the Headquarters has a **civic frontage and a public entrance** — a glazed hall, a
canopy, people arriving, a totem sized for a visitor — and the Data Centre has a **service door
and nothing else**. The Headquarters is a building the town uses; this is a box the town is served
by. Secondarily it must not resemble **era eight's Weather Office or Telephone Exchange**, which
are also long low blocks on the `hall` mass one era away: both of those are **ribbon-glazed**, one
showing a chart room through the glass and the other carrying a flat projecting canopy, where this
is sealed with no ribbon and no canopy. Glazed-and-banded against blank-and-louvred holds at any
zoom.

---

### 2. the Office Tower — `EL.2`, `tower` mass

**Plot: 2×2 (8×8u).** The square plot is deliberate: a smaller plot would shrink the whole model
rather than make it slender, so **the slenderness has to be authored into the model** and the plot
left alone.

**Silhouette.** **A tall glass prism standing on a wider stone-clad base, with a lit band at the
crown.** Two clean horizontals — the top of the podium, and the parapet — and one uninterrupted
vertical between them. Authored several times taller than it is wide, and the proportion is the
whole of what makes it read as a tower.

**How it stands up.** Podium and tower, the era's standard composition: a wide clad base holding
the ground, with the taller element set on it **ignoring** the ground entirely. Unitised
curtain-wall units storey by storey with a regular mullion and transom grid and a spandrel panel
at each floor, drawn tight over a frame that never shows. Shadow gaps at the podium's foot and
under the parapet.

**Materials and ornament.** Curtain-wall glass over the whole shaft; engineered stone cladding on
the podium in large thin panels with tight joints; expressed structural steel **only** at the
entrance canopy. No ornament: the glazing grid is the pattern and the crown band is the
interruption.

**The detail that has to read: the regularity of the grid.** The mullion and transom pattern must
stay perfectly even over the full height and around every corner. **An irregular grid reads as an
earlier era** — it is the single fastest way to lose the era on this building.

**Emitted light.** The **lit crown** at the parapet is an emissive band inside the model. It is
bright in itself and lights nothing: no glow on the glass below it, no halo, no gradient down the
shaft.

**Props.** A wayfinding totem and a display panel at the podium entrance. Cycle docks and a rank
of matched stands at the podium's foot. Multi-stem trees in flush grilles along one edge. Slim
lighting columns with heads on outriggers.

**Height.** **The tallest thing era nine builds on the skill side**, and the closest a roofed
building has come to a mast since era six's dome. Only the civic Condominium goes higher.

**What it must not resemble.** **The Condominium (#9), which is also a tall thin tower in this
era and is the sharpest pair in the set.** They separate on **skin and edge**:

| | the Office Tower | The Condominium |
| --- | --- | --- |
| Skin | **Continuous curtain-wall glass**, one grid, unbroken | **Opaque composite panel in two tones**, no continuous glazing above the lobby |
| Edge | **Flush.** Nothing projects from the shaft at all | **Notched.** Balconies project on alternating floors, so the silhouette is checkered |
| Base | A wide **stone-clad podium** the shaft stands on | **No podium.** One cell, straight off a shadow gap into a double-height lobby |
| Crown | A **lit emissive band** at the parapet | A **louvred plant screen** |

A flush glass prism on a wide base against a notched panel shaft on no base holds at full
zoom-out, where a difference in floor count would not. Against era eight's **Cooling Tower** — the
other `tower`-mass building next door — there is no risk: a hyperbolic curved mass with steam at
its rim is not a rectilinear glass prism.

---

### 3. the Chip Factory — `EL.3`, `workshop` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Clean Room*.** This document's verdict is
> **REJECT** — see rename 1. The three objections are the *Chip Plant* collision one era along,
> the three-consecutive-Factory run, and the loss of a name the guide says is load-bearing because
> it announces a recorded chain break. **Nothing below depends on the name.**

**Plot: 2×2 (8×8u).** The guide calls this the sealed laboratory *"at full-plot scale"* against
the inherited single-tile instance, so the plot is what makes it the larger of the pair.

**Silhouette.** **A windowless block with a projecting airlock snout on one face and a fenced
cluster of tanks against another**, standing on a low plinth. Two accents on one shape, and both
are attachments rather than modulations of the box.

**How it stands up.** Frame behind skin. A sealed rainscreen wrapped over every face with no
opening at all above the entrance — **the outside does not get in, and that is the whole of what
the building is.** A plinth of engineered stone lifts the box off the paving, and the skin stops
short of it in a shadow gap. Flat roof behind an upstand with a louvred plant screen and an
extract stack.

**Materials and ornament.** Composite panel throughout; engineered stone for the plinth; a small
area of glass at the airlock and nowhere else. Zero ornament. **No roof lights anywhere**, which
is a deliberate departure from every workshop-mass building in the run before it.

**The detail that has to read: the airlock entrance.** A projecting vestibule with a **pair** of
doors in line and a display panel beside the outer one, reading at distance as a shallow box
pushed out of the wall. It is the one thing that says *sealed*, and it is what the era's own
argument turns on.

**Props.** The **gas store** beside the building: bulk vessels on a bunded pad behind a low clad
screen, with a pipe manifold running to the wall. Flush duct markers. A wayfinding totem. **No
planting on this plot** — the ground is operational.

**Height.** Above the Research Lab and well below everything else. **Kept deliberately low**, and
against the era's instinct to make every clad box a monument.

**What it must not resemble.** **Era ten's fab shop (`TRG.2`), which is the same building one era
on** — *"a windowless clad box with an airlock and an exhaust stack"* — and is the sharpest
cross-era confusion this building has. They separate on **substance and fixings**: era ten makes
its fixings visible again on purpose and runs conduit and cable tray across an elevation, where
era nine's whole premise is that nothing shows how it was made. **Era nine's box has no visible
fastener anywhere; era ten's shows them.** Secondarily, against **era eight's Wind Tunnel and
Electronics Works** on the same mass one era back: both of those show their working floor — a tall
glazed bay over a plinth in one, north-lit sawtooth bays in the other — where this shows nothing.
**Sealed against lit, on the aperture,** and it holds at any zoom because a sawtooth roof is a
silhouette.

---

### 4. the Research Lab — `EL.4`, `store` mass

> ## ⚡ RE-AUTHORED 2026-07-30 — DRAW THE LABORATORY BELOW, NOT THE SHED
>
> **The lead has ruled that the building matches the name.** Until 2026-07-30 this brief authored a
> logistics shed under a laboratory's subtitle and told an artist to *"draw this and raise the
> name"*; that instruction is withdrawn. `era-09-information/style-guide.md` §5's `store` entry
> carries the new form and the new pair separation, and the brief below is written from it.
> **Nothing about the plot, the mass or the node moves** — 2×2, `store`, `EL.4`.
>
> **The old brief is kept in full underneath, because it is the record of what was drawn against
> until today** and because two of its findings survive the change: the D-ERA8 warning about a
> meaningful count, which transfers to the bay module, and the substance axis against era eight's
> sheds, which is unaffected.

**Plot: 2×2 (8×8u).** The square plot is the same problem it was: this building has to read
**long** and the plot will not do it, so the model must be authored emphatically longer than it is
deep and let the contain-fit keep the proportion.

**Silhouette.** **Two long volumes side by side and a comb of thin verticals over them.** A blind
two-storey bar at the back, a single-storey wholly glazed range in front of it at half the height,
and a rank of slim extract stacks standing clear of the bar's parapet. **A step in section plus a
comb**, and both halves of that read at max zoom-out on their own.

**How it stands up.** Frame behind skin, as everywhere in the era. The lab bar is a rainscreen of
anodised composite panel set out on a **bay module that never varies**, with a flush service riser
beside each joint, so the wall is counted rather than continuous. The write-up range is unitised
curtain wall floor to soffit, stepped forward of the bar. Both skins stop short of the paving in a
**shadow gap**; a flush glazed link closes each end of the slot between them. Flat roofs behind
upstands, and **nothing boxy on either of them.**

**Materials and ornament.** Anodised composite panel on the bar; unitised curtain-wall glass on the
range; engineered stone at the plinth and the paving. Zero ornament, as the era has none. **No
signage band, no logotype, no back-lit fascia** — the display panel beside the entrance door is the
only graphic on the building.

**The detail that has to read: the stacks, one per bay.** Plain capped ducts, all the same height
and diameter, standing clear of the parapet on the bays' own spacing, with the last storey of each
riser expressed in the open where it climbs the wall. **That comb is the whole of the top edge** —
no chiller, no louvred plant screen, no lift overrun. It is what says *many experiments running at
once* from a distance, and it is the one thing on the building that the fab at `EL.3` cannot have.

**Props.** A run of desks and task chairs visible through the glazed range, and nothing else inside
it. Flush duct markers. A wayfinding totem at the plot edge. Staff parking marked on the paving.
**And an authored absence: no tank, no bunded pad, no fence, no trailer, no dock apron, no
planting.** The emptiness of the plot is a separator and must survive the artist's instinct to fill
it.

**Height.** **The lowest roofed building era nine builds**, with only the Air Force Base below it —
unchanged, because two storeys and a stack are still less than everything else here.

**What it must not resemble.**

- **`EL.3`, the Chip Factory (#3), and this is now the pair the era turns on.** Both are windowless
  technical buildings on 2×2 plots in one body hue, so the axis is structural and is stated five
  ways in the guide. The two that carry it at zoom-out: **one sealed envelope against two volumes
  stepped in section**, and **one extract stack against a comb of them**. The three that finish it:
  an unarticulated face against a counted bay module, blind against a glazed occupied range, and a
  fenced pad of bulk gas vessels against a plot holding nothing but the building.
- **`EL.1`'s server hall (#1)**, the era's other long blind clad box: it wears a **louvred plant
  wall** and carries **chillers ranked flat on the roof**. Squat boxes ranked flat against slim
  verticals standing clear — opposite top edges, and this one has no louvre anywhere.
- **The Distribution Center (civic, #8)** — *"the era's sharpest confusion"* until today, and it is
  now free. The shed keeps the long dock face, the trailers, the glazed office **corner**, the roof
  plant and the solar array; `EL.4` has none of the five. **The glazed corner and the solar array
  are no longer load-bearing**, which is worth saying because the old brief made them mandatory.
- **The Hospital (civic, #10)**, the era's other institution with a glazed ground floor: six
  storeys, a deep entrance canopy, an ambulance bay, a heli-pad and a planted courtyard, against two
  storeys with no canopy, no courtyard and nothing on the roof but ducts.
- **Era eight's three sheds** on the same mass one era back — the Radio Workshop, the Nuclear
  Weapons Facility and the inherited depot — **substance, and unchanged by the re-author**: era
  eight's are concrete frames with wired glass, a visible slab edge and a board mark; era nine's is
  a sealed panel skin with no frame, no wired glass and no visible fastener anywhere.
- **Era ten's Robotics Lab (`TRG.7`)**, one era on and the island's other *Lab*: a single storey of
  dark glass straddling an older roof, retrofit, no display. New-built and two volumes against
  bolted-on and one.

**Per D-ERA8, and the warning is the old brief's, transferred.** `EL.4` hosts logarithmic graphs and
their domain, whose picture is a **compressed axis**, so **the bay module is constant and the stacks
are identical and evenly spaced.** Bays crowding toward one end, stacks shortening along the run, a
rhythm that halves — each is a log scale drawn on a building. **The rhythm is period, not
arithmetic**, and the count must mean nothing.

<details>
<summary><strong>The pre-2026-07-30 brief — the logistics shed, kept as the record of what was drawn against</strong></summary>

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Parcel Depot*.** This document's verdict is
> **REJECT, and this is the worst of the four** — see rename 2. The proposed name describes a
> different building on every axis, and on the `store` handle it would announce as **"Store, the
> Research Lab"**. **The brief below is the shed the files author.** An artist who has been handed
> the new name should draw this and raise the name.

**Plot: 2×2 (8×8u).** The square plot is a problem to solve rather than a help: this building has
to read **long** and the plot will not do it, so the model must be authored emphatically longer
than it is deep and let the contain-fit keep the proportion.

**Silhouette.** **A long low shed with a rank of dock doors down one flank and a row of trailers
standing off it.** Flat top edge, unbroken; the rhythm of the dock openings is the only incident
on the elevation. The trailers are part of the silhouette and should read as a second, lower band
in front of the building.

**How it stands up.** Tilt-slab construction — large panels stood up and sealed, so the panel
joint pattern is the whole of the detail and wants setting out deliberately rather than tiling at
random. Frame behind, invisible. The skin stops short of the apron in a shadow gap. A clear span
over one undivided floor with the plant hidden above the soffit; flat roof behind an upstand.

**Materials and ornament.** Composite and tilt-slab panel throughout, **with the glazing left
out** — this is the era-one store's chain descendant with its shop front removed, and there is
**nothing to see into**. Engineered stone only at the retaining face of the apron. One back-lit
signage band above the dock line.

**The detail that has to read: the dock rhythm.** Full-height dock doors at a constant spacing
down the long flank, each with a dock leveller and a shallow shelter over it, repeating far enough
to establish a rhythm rather than a count. **Do not make the count meaningful** — no rows in
powers, no doubling bay. The rhythm is period, not arithmetic.

**Props.** Articulated **trailers parked in a rank on the apron**, uncoupled, and they are
load-bearing for recognition. Flush drainage channel across the apron. A clad bin store. A
wayfinding totem at the gate. No planting.

**Height.** **The lowest roofed building era nine builds**, with only the Air Force Base below it.

**What it must not resemble.** **The Distribution Center (civic, #8), and this is the era's
sharpest confusion because the two are authored in nearly identical words.** They separate on
**aperture and props, never on geometry**:

| | the Research Lab *(`EL.4`)* | The Distribution Center *(civic)* |
| --- | --- | --- |
| Reads | **Wholly blank.** Nothing glazed anywhere | **One glazed office corner**, and it is the only glass on it |
| Roof | Flat and empty behind its upstand | **Roof plant and a solar array**, so the top edge is populated |
| Yard | Trailers in a rank, uncoupled | Trailers at a **long continuous dock face**, and a logo band |
| Plot | 2×2 skill | 2×2 civic |

**The glazed corner and the solar array are the whole separation and they must both be present**,
because if the civic loses either one the two buildings are the same object. Secondarily, against
**era eight's three sheds** on the same mass one era back — the Radio Workshop, the Nuclear Weapons Facility and
the inherited depot — the separation is **substance**: era eight's are concrete frames with wired
glass, a visible slab edge and a board mark, loading through narrow shutters or a tall gable end;
era nine's is a sealed panel skin with no frame, no wired glass and no visible slab. And against
**era four's bonded warehouse**, which also has a loading platform: barrel vaults against a flat
upstand.

</details>

---

### 5. the Glass Apartments — `EL.5`, `dwelling` mass

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *the Podium Flats*.** This document's verdict is
> **REJECT** — see rename 3. Glass is the era's declared body material, this is the one era-nine
> building whose body is explicitly composite panel rather than glass, era nine already holds a
> second apartment building in the civic Condominium, and the word *Apartment* was ruled
> unavailable in this era by the Condominium's own rename banner, because era eight's bought
> housing is The Apartment Tower.

**Plot: 2×2 (8×8u).**

**Silhouette.** **A slab set back on a wider base, with a garden on the base's roof.** Three
elements stacked and each reading at zoom-out: a two-storey glazed retail base filling the plot; a
green rectangle on top of it, bounded on two sides by the slab and on the others by its own
parapet; and the slab itself rising off the podium, its long faces banded with continuous
balconies. **The green at mid-height is the silhouette's whole distinctiveness.**

**How it stands up.** Podium and tower again, but with the podium **occupied** rather than merely
holding the ground. Frame behind skin throughout. Balconies project from the slab's long faces as
a continuous band at every floor, and the parapet edge of each band is what gives the elevation
its horizontal grain. Shadow gaps at the base and at the slab's parapet. Ramps rather than steps
where the retail base meets the paving.

**Materials and ornament.** **Composite cladding as the slab's body — not glass** — with plate
glass restricted to the retail base and the lobby; anodised balcony rails; engineered stone at the
podium's retaining faces. The planting on the podium is in engineered soil over waterproofing:
**naturalistic in form while being entirely artificial in fact**, which is the era's habit
everywhere it plants.

**The detail that has to read: the podium garden is BOUNDED.** Planted, edged, and reachable only
from the flats above — enclosed by the block on two sides and by its own parapet on the others.
**This is the repair of the flag era eight raised**, where the shared yard dissolved into a lawn
the block merely stood in. It is a yard that has been **lifted off the ground rather than lost**,
and if it reads as landscaping rather than as an enclosure the building has failed the one thing
its chain still asks of it.

**Props.** Multi-stem trees in generous groups and grasses in drifts on the podium top; sedum at
the slab's own roof edge. Cycle docks and a recycling enclosure at the retail base. A display panel
at the residential entrance, separate from the retail signage. Slim lighting columns along the
street edge.

**Height.** Level with the Headquarters, above the Data Centre. **The housing stays among the
tallest things era nine builds, as it has since era eight** — and the civic Condominium is taller
still.

**What it must not resemble.** **Four earlier housing buildings and one in its own era.** The
five-deep lineage is worked through in its own section below, because one table cannot carry it.
The one-line version: **era nine's is the only dwelling in the run that stands on a podium with the
shared ground on top of it**, and the only one whose slab is a single undivided face with no unit
divisions visible at all. Within the era, against **The Condominium (#9)**, see the table at #2 —
continuous glazing and a projecting-alternate-floor notch there against composite panel and a
continuous balcony band here, plus a podium against a single cell.

---

### 6. the Air Force Base — `EL.6`, `yard` mass

**Plot: 2×2 (8×8u).**

**Silhouette.** **A fenced plot with dishes rising off it and one small cabin.** The dishes are
the only things standing, and they are the whole read: tilted concave discs at a shared angle,
mounted on pads, reading at zoom-out as a group of ellipses on stalks. Everything else on the plot
is flat.

**How it stands up.** It barely does, and that is correct. Each dish sits on a concrete pad with a
short mount; the cabin is a small clad box; the mesh fence carries nothing but itself. **The plot
never rises** — this is the ninth era running in which the `yard` mass stays ground, after swept
earth, a threshing floor, a weighing yard, a paved court, a kitchen garden, a parterre, a works
yard and a mown park.

**Materials and ornament.** Composite panel on the cabin, galvanised mesh on the fence, engineered
unit paving over the pads and between them. **Nothing planted** — this is the purely operational
version of the mass, and the planting that proves ground is being *kept* open belongs to the
inherited instance, not to this one. A hazard plate and a display panel on the cabin. No ornament.

**The detail that has to read: the dishes point the same way.** All of them at one elevation and
one azimuth, because a satellite is in one place. **A yard of dishes aimed randomly reads as
scrap**, and one aimed dish is a prop while a rank of parallel ones is a building.

**Props.** Flush duct and fibre markers set into the paving pattern, and inspection covers made
part of that pattern rather than apologised for. A cable tray run **at ground level between the
pads**, never up an elevation. A single lighting column.

**Height.** **The lowest thing era nine builds, and the lowest plot on the island.** Something has
to hold the bottom of the band while everything else climbs.

**What it must not resemble.** **Era eight's Power Station (`FUN.10`)** *(the files read* the
Substation *until the consolidated pass, which re-authored it from a fenced yard into a ribbon-glazed
turbine hall — so this pair is now far wider than the sentence below assumes)***, which is authored in the same
sentence shape** — *"lattice towers on concrete pads behind a mesh fence, a small switch cabin"*
against *"satellite dishes on concrete pads behind a mesh fence, a small equipment cabin."* They
separate on **orientation and substance**: era eight's verticals are **open lattice frames rising**
and era nine's are **closed concave discs tilted**, and era eight's ground is concrete pads on soil
where era nine's is engineered unit paving on structure with flush markers in it. **Frames up
against dishes over holds in silhouette; the ground difference is the backup.** Secondarily,
against **era two's Sheep Pen** and **era three's ingot-weighing yard**, both of which are also a
bounded plot with almost nothing standing on it — the separation there is substance and is free:
woven hurdling and trodden earth, or an open stone table under the sky, against galvanised mesh and
precise unit paving. And against **era ten's dish yard (`TRG.1`)**, which is the genuinely
dangerous one: fixed dishes bolted down on a fenced pad with **cable trays running between them**.
Era ten runs its trays in the open as its signature; era nine's are flush in the paving. **Keep
every tray on this plot below the surface.**

---

### 7. the Headquarters — the hub, `town-hall`

**Plot: the wide plot, 3×2 (12×8u).** The era's landmark, and unique by right.

**Silhouette.** **A long clad block behind a civic frontage, with a rank of chillers along the
parapet and a shimmer of warm air above them.** Wide rather than tall. The frontage is the
building's one public gesture and the plant rank is its top edge, so the two ends of the silhouette
are doing different jobs.

**How it stands up.** Frame behind skin. A long clear-span volume with the plant in the depth above
the soffit; the frontage is a glazed hall under a deep canopy on expressed steel, set against the
clad mass rather than carved out of it. Engineered stone on the podium and retaining faces. Shadow
gaps at ground and parapet. Ramps to the entrance, not steps.

**Materials and ornament.** Composite panel for the long block; curtain-wall glass for the
frontage; **expressed structural steel at the canopy, which is one of only two places in the era
where steel is permitted to show**; engineered stone at the base. A back-lit signage band across
the fascia and a logotype standing off the panel.

**The detail that has to read: the shimmer of warm air above the chillers, and it is the era's
whole argument in one prop.** Era one's Stone Circle was a fire people stood at; era seven made it
a boiler and its smoke the island's tallest chimney; era eight enclosed it and left a plume. **Era
nine takes even the plume away** — the communal fire has become waste heat, and the only way to
know the building is warm is the air above it. Render it as a **distortion of the silhouette
behind it**, not as a light, not as a glow and not as smoke. It is the ninth link in the *sheltered
communal fire* chain and the most nearly invisible one.

**Props.** Wayfinding totems in both heights at the plot edge. A display panel at the entrance and
another above the counter inside the glazed hall. Cycle docks, matched recycling enclosures,
multi-stem trees in flush grilles, sedum on the podium top. Slim lighting columns with heads on
outriggers.

**Height.** Level with the Glass Apartments, above the Data Centre and the Research Lab. **Wide
rather than tall**, and out of the top two — where the hub has been since era eight.

**What it must not resemble.** **The Data Centre (#1)** — see the table there; frontage and public
entrance are the separation, and the Headquarters is the one with both. **And this is the one
building in era nine with no cumulative confusion set at all**, which is worth stating rather than
leaving as an absence: the hub is the only building that re-themes, so era eight's Heating Plant is
**replaced** rather than joined. Only one hub ever stands. Otherwise there would be a real problem
here — era eight's hub is authored as *a boiler house behind a civic frontage with the plume above
the parapet*, which is this building's sentence with one word changed.

---

### 8. The Distribution Center — civic, food *(2×2)*

> **✅ MERGED in the consolidated rename pass. Until it landed the files read *The Food Warehouse*.** This document's verdict is
> **REJECT** — see rename 4. This is the **food** row and the new name does not say food; the era's
> own subtitle row already considered and refused *Distribution Centre* on two grounds; and the name
> is the only thing separating this building from `EL.4`, which is authored in the same words.

**Plot 2×2 (8×8u). Cost 20,480 silicon, food for ~5,120.** Wins on resource efficiency; loses
because it is a shed with a logo and contributes nothing to the skyline. **Deliberately banal**,
and that is the brief rather than a shortfall.

**Silhouette.** **A long shed with a continuous dock face, one glazed corner, and a populated
roof.** Flat and low, with the roof plant and the solar array giving the top edge its only
incident. The glazed corner is the second accent and it is small.

**How it stands up.** Tilt-slab panels stood up and sealed; a profiled steel roof over a clear
span; the glazed corner cut into one end at ground and first floor. The apron is engineered paving
on structure with a flush drainage channel.

**Materials.** Precast concrete panel, profiled steel roof, plate glass at the corner — **and note
this is the one building in era nine that reads as precast concrete rather than composite
rainscreen**, which is a departure from the era default and is exactly why it looks banal beside its
neighbours. Keep it, because it is the differentiator.

**The detail that has to read: the glazed office corner and the solar array, together.** They are
the only two things distinguishing this building from `EL.4`, and neither survives alone. The
corner is a two-storey glass return wrapping one end of the shed, with a desk visible in it; the
array is a field of flat panels laid across the roof in a regular grid, reading as a texture change
on the top face rather than as objects.

> **AMENDED 2026-07-30 — the two are no longer LOAD-BEARING, and they are kept anyway.** `EL.4` was
> re-authored as an actual laboratory on the lead's ruling, so **this building is now the era's only
> shed** and the corner and the array are no longer all that stands between two identical objects.
> **Draw them regardless**: they are what makes a banal box legible as an office-and-warehouse
> rather than as a blank, and this row is the era's **food** building, which needs to look like
> somewhere goods are handled. What changes is only the stakes — losing one of them is now a weaker
> drawing rather than a collision.

**Props, and they carry the read.** Trailers backed onto the dock at a continuous face rather than
parked off it. A logo band the full width of the dock elevation. A wheel wash and a gate. A
display panel at the office door.

**Height.** ~10 units, above the Chip Factory and the Research Lab, below the Roof Garden's trees.

**What it must not resemble.** **the Research Lab (`EL.4`, #4)** — see the table there, and the
separation is aperture and props. *(Since `EL.4`'s 2026-07-30 re-author the separation is much
wider than that: a shed with a dock face against a two-volume laboratory with a comb of extract
stacks and no dock at all. This line is kept because the pair is still worth checking, not because
it is still close.)* **And two food buildings in earlier eras**, which is a real
cross-era finding rather than a formality: **era eight's The Supermarket** (2×2, food, *"a big flat
box — the least interesting silhouette in the era"*) and **era four's The Grain Dock** (2×2, food,
*"a blank box — the least characterful thing in the era"*). All three are 2×2 food boxes each
described by its own file as its era's dullest object. Against era eight's, the separation is
substance and use: a supermarket is glazed to the street and faces a car park, where this faces a
dock. Against era four's it is free, being masonry. **But the three sit close enough that this
building's glazed corner and solar array are doing cross-era work as well as within-era work.**

---

### 9. The Condominium — civic, livability *(1×1)*

**Plot 1×1 (4×4u), the smallest plot in the era. Cost 23,040 silicon, 5,120 livability.** Wins on
land efficiency; loses on resource efficiency. Renamed 2026-07-29 from *The Residential Tower*,
and that rename is merged and in the files.

**Silhouette.** **Fifteen storeys of notched shaft on one cell, with a louvred crown.** The notch
is the silhouette: balconies project on **alternating** floors only, so the profile steps in and
out up the whole height rather than reading as continuous banding. A double-height glazed lobby at
the foot, and a plant screen at the top.

**How it stands up.** Frame behind skin, straight off a shadow gap with **no podium** — the whole
building is the shaft. Balconies cantilever from alternating floors. The lobby is a two-storey glass
box occupying the full cell at ground level.

**Materials.** Composite panel in **two tones**, plate glass at the lobby, anodised balcony rail.
No engineered stone: there is no base for it to face.

**The detail that has to read: the lobby with somebody behind a counter in it.** **The lobby is
what the name is for** — a managed entrance with a desk and a person at it is what separates this
from every earlier dwelling in the run, all of which had a door. It must be visible from outside
and it must read as *staffed*.

**Props.** A display panel and a wayfinding totem at the lobby. Cycle docks and a matched recycling
enclosure. A multi-stem tree in a flush grille, singular — there is one cell and no room for a
group.

**Height.** ~22 units. **The tallest thing era nine builds anywhere**, and near the
`MAX_BUILD_HEIGHT` ceiling. *(See **Defects**: §3 of the style guide says nothing in era nine
reaches the ceiling, which this does not bear out.)*

**What it must not resemble.** **the Office Tower (`EL.2`, #2)** and **the Glass Apartments
(`EL.5`, #5)** within the era — the table at #2 carries both axes. **And era eight's The Apartment
Tower, which is the sharpest cross-era confusion in this whole document.** That building is *"twelve
storeys on one cell: a concrete frame with infill panels in two alternating tones, ribbon balconies
on the long faces, a plant room and lift overrun on the roof, a glazed ground-floor lobby"* —
**same 1×1 plot, same two-tone panelling, same balconies, same glazed lobby, same roof plant, three
storeys apart, and both stand in the same city forever.** The rename that produced *Condominium*
cleared the *name* collision and left the *art* collision entirely untouched. They separate on
**frame and edge**:

| | The Apartment Tower *(era 8)* | The Condominium *(era 9)* |
| --- | --- | --- |
| Skin | A **concrete frame with infill panels** — the frame grid reads as structure, arrises sharp | A **sealed rainscreen** with no frame visible at all, joints narrow and open |
| Balconies | **Ribbon** — continuous along the long faces, so the profile is banded | **Alternating floors only**, so the profile is checkered |
| Crown | A **plant room and lift overrun** — two boxes standing above the parapet | A **louvred plant screen** — one flat element wrapping it |
| Base | A **plinth**, a few steps up | A **shadow gap**, and a ramp |

**Banded against checkered is the axis that survives the camera**, and it is the one to protect.
Reported as a finding rather than as a brief note: this pair is close enough that it deserves the
lead's attention on the art as well as on the names.

---

### 10. The Roof Garden — civic, happiness *(3×2)*

**Plot 3×2 (12×8u). Cost 25,600 silicon, 5,120 happiness.** Wins because it is the only green in a
glass city and reads from any angle; loses badly on land efficiency at six cells, mostly not
building. Renamed 2026-07-29 from *The Park*, and that rename is merged.

**Silhouette.** **A city at ground level and a park on the first floor.** A wide glazed podium with
a full garden carried on its roof — lawn, clipped trees and a long water channel on top, planting
spilling over the parapet — with a **spiral ramp** and a glass lift climbing the outside. The trees
above the parapet line are the read, and they are the only tree canopies in the era that stand at
building height.

**How it stands up.** A concrete podium carrying deck planting in engineered soil over
waterproofing; a plate-glass retail base under it with a station entrance tucked in; the ramp
wrapping one corner as a structural helix; the lift as a glazed shaft on the outside face.

**Materials.** Concrete podium, plate-glass retail base, deck planting, stone paving, glass
balustrade.

**The detail that has to read: the level change.** **You go up to reach the green**, and from the
deck you look down on the glass city rather than along it. The ramp and the lift both have to be
legible as *ways up*, and the planting has to be visibly *on* something rather than beside it. If
this reads as a park with a building next to it, the building is gone.

**Props.** Multi-stem trees in generous groups and grasses in drifts on the deck; reed and iris in
the water channel; a glass balustrade at every edge; a display panel and a totem at the station
entrance; sedum where the deck is not walked on.

**Height.** The podium ~6 units, the trees to ~11.

**What it must not resemble.** **the Glass Apartments (`EL.5`, #5)**, which is the other era-nine
building with a garden on a podium, and the risk is real at zoom-out. They separate on **access and
enclosure**: this garden is **public and open** — you reach it by a ramp and a lift on the outside,
and it is the whole top surface of the podium — where `EL.5`'s is **private and bounded**, enclosed
by the slab on two sides and reachable only from the flats above. **One is a deck you climb to; the
other is a court you cannot get to.** Secondarily against **era eight's The Swimming Pool**, the
other 3×2 happiness civic one era back: a roofed pool hall against an open planted deck, which is
free.

---

### 11. The Hospital — civic, blend *(1×2)*

**Plot 1×2 (4×8u). Cost 30,720 silicon, 2,560 livability + 2,560 happiness.** Wins on the blend, in
a shape that lines a street; loses on resource efficiency. **Moved here from Early Modern on
2026-07-29** — this slot used to be *The Clinic*, and era six is now *The Painters' School*. Both
blends were already 1×2, so nothing but the identity moved.

**Silhouette.** **A six-storey range with a deep canopy at the bottom and a screened roof.** Long
and narrow, lining its street rather than standing in a plot. Three horizontal registers: a glazed
entrance level under the canopy, four floors of horizontal louvre above it, and the plant screen
and heli-pad on top. The ambulance bay's own canopy is the one asymmetry.

**How it stands up.** Frame behind skin. The entrance and waiting hall are glazed the full height
of one storey under a deep projecting canopy on expressed steel; ward and treatment floors above sit
behind **horizontal aluminium louvre**, which is what gives this building its grain; a plant screen
wraps the roof. Shadow gaps at ground and parapet. Ramps at every level change.

**Materials.** Composite panel, plate glass, aluminium louvre, anodised canopy.

**The detail that has to read: the horizontal louvre banding on the ward floors.** It is the only
place in era nine where a face is banded horizontally rather than gridded, and it is what makes this
**the most serious building on its street** without any ornament being applied to it. **The full
institution rather than a front door to one** — this is where the whole city goes.

**Props.** An ambulance bay at one end with its own canopy. A small planted courtyard the wards look
into, visible over or through the low end of the range. A heli-pad on the roof. Wayfinding totems at
both ends, and a display panel at the entrance.

**Height.** ~18 units, second only to the Condominium among era nine's buildings.

**What it must not resemble.** **Nothing else in era nine is a horizontally louvred range**, so the
within-era risk is blandness rather than confusion: a six-storey clad box with a canopy is easy to
draw as an office. The louvre banding and the ambulance canopy are what stop that, and both must be
present. **Across eras, the confusion the swap was made to remove is now genuinely gone**: era six's
blend is *The Painters' School*, so the run holds one medical building instead of a Clinic and a
Hospital three eras apart. Against **era eight's The Fire Station** — the blend one era back, 2×1,
the same two cells rotated — the separation is institutional and free.

---

## The cumulative confusion set

**The skill's Step 5 scopes "what it must not resemble" to the era's own siblings. That is too
narrow here.** Under the 2026-07-29 no-re-dress ruling a skill building is drawn once, keeps its
look permanently and is never demolished, and a civic building is frozen at purchase, so **an
era-nine city has eras one through eight standing on it** — 47 skill buildings plus up to 32 civic
purchases. Every confusion set above is therefore scoped cumulatively, not to era nine.

**What was checked, and how deeply.** Era eight **in full**, from its source documents at
`docs/superpowers/specs/eras/era-08-atomic/`, because it is adjacent and its own brief is being
written now. Eras five, six and seven **as a scan** from their source documents, their briefs being
in flight. Eras one through four **as a scan**, with era two read from its written and locked brief
at `output/imagegen/era-02-neolithic-building-briefs/README.md`. Era ten was read as well, though it
does not stand on an era-nine island, because three of era nine's names and two of its forms are one
era from era ten's and the names are permanent.

**Six genuine cross-era confusions were found and each is written into the building it affects**:
`EL.4` against era eight's three sheds; `EL.6` against era eight's Power Station *(was the
Substation)* and era ten's dish
yard; `EL.3` against era eight's two workshops and era ten's fab shop; `EL.1` against era eight's
two halls; **The Condominium against era eight's Apartment Tower**, which is the sharpest and is a
civic-against-civic pair the naming pass did not touch; and **The Distribution Center against era
eight's Supermarket and era four's Grain Dock**, three 2×2 food boxes.

> **AMENDED 2026-07-30 by `EL.4`'s re-author, in both directions.** The first pair **survives on the
> same axis** — era eight's sheds are concrete frames with wired glass and a board mark, era nine's
> is a sealed panel skin with no visible fastener — so the finding transfers unchanged even though
> `EL.4` is no longer a shed. **One new cross-era pair joins the list**: `EL.4` against **era ten's
> Robotics Lab** (`TRG.7`), the island's other building whose name ends in *Lab*, one era on;
> new-built two stepped volumes on their own ground against a single storey of dark glass straddling
> an older roof. And **one in-era pair leaves it**: `EL.4` against the civic Distribution Center,
> which is now a laboratory against a shed rather than the same sentence twice.

**And a clean result worth reporting as a result.** Eras one, two and three carry **no** confusion
with era nine that needs an argument, and the reason is structural rather than lucky: those eras'
materials are earth, thatch, mud brick, undressed stone and unmortared masonry, and era nine's are
glass, composite panel, expressed steel and engineered stone. **Substance separates them for free
at every zoom.** The only pairs worth naming at all are the ground-only plots — era two's Sheep Pen
and era three's ingot-weighing yard against `EL.6` — and even those separate on substance without
needing a plan or props argument. Era four and era five likewise: one loading platform (era four's
bonded warehouse) and one long store (era five's Wool Store) sit near `EL.4` in *function*, and a
barrel vault and a stone gable put them nowhere near it in *form*. **The cumulative set is a real
constraint from era six onward and essentially free before it.**

### The five-deep housing lineage, and how era nine's separates

**First, a correction to the premise, because it changes the count.** The lineage was put to this
brief as five consecutive eras — *timber houses, town houses, brick terraces, blocks, and now glass
apartments*. **Era seven's Brick Terrace is not a building.** Era seven's roster is `FUN.1` `hall`,
`FUN.2` `store`, `FUN.3` `workshop`, `FUN.7` `hall`, `FUN.8` `workshop`, `POL.5` `tower` — **no
node on `dwelling` at all.** *the Brick Terrace* is era seven's subtitle for a mass its roster does
not occupy, and the brick terrace described in that guide's masses section is the **inherited**
chain instance under the REFERENCE ONLY banner, which the ruling means is never drawn. So era seven
builds no housing. *(Era two, era three and era four are in the same position — each carries a
`dwelling` subtitle with no roster node behind it. Reported under **Defects**, not fixed.)*

**What actually stands.** Five skill dwellings are built across the run up to and including era
nine, and they are not consecutive:

| Era | Node | Dressing | The authored form |
| --- | --- | --- | --- |
| 1 | `NUM.2` | the Hut Cluster | Three or four small domed huts of unequal size sharing one packed-earth yard — **not a terrace**; the row-ness is repetition, not a party wall |
| 5 | `RAT.6` | the Timber Houses | A **wall row**: narrow houses built against the inside of the town wall with their backs to it, no ground behind them, entered from the street through a single covered passage, longer than three houses |
| 6 | `POL.6` | the Printing House | A party-walled range, rusticated shop fronts at ground, smooth stucco above, **a chimneystack at each party wall**, and **no court** |
| 8 | `FUN.9` | the Housing Blocks | A deck-access maisonette block: four storeys, an **open access gallery** along one face, external stair towers at both ends, **standing free in mown grass** |
| 9 | `EL.5` | the Glass Apartments | A balconied slab in composite cladding over a glazed retail base, with the shared yard become **a private garden on the podium** |

**So the depth is five buildings, four of them attached multi-dwelling** (eras five, six, eight,
nine), with era one's detached cluster as the fifth. **On top of that the civic livability row is
housing in every single era and is frozen at purchase**, so an era-nine island can additionally
hold The Family Lodge, The Village Houses, The Walled Houses, The Cottages, The Castle, The Merchant
Houses, The Workers' Houses, The Apartment Tower and The Condominium. **The real cumulative housing
count an era-nine city can reach is fourteen buildings**, which is worth knowing before deciding
that era nine's separation is a detailing question.

**How era nine's separates, on MASS and PLAN.** Period detailing — a jetty, a chimneystack, a
rusticated shop front, a balcony rail — is the first thing to go at zoom-out, so none of it is
allowed to carry this.

**On mass, era nine's is the only two-part object in the lineage.** Every other one of the five is a
single volume meeting the ground: era one's cluster sits on the earth, era five's row is built
against a wall, era six's range meets its street, era eight's block stands in grass. **Era nine's is
a wide low base with a taller thinner slab set back on top of it**, so its section is a T rather
than a rectangle, and the shadow gap at the junction reads the two elements as separate objects.
**No other dwelling in the run has a second horizontal element at all.** At full zoom-out era
nine's housing is the only silhouette in the lineage with a step in it.

**On plan, era nine's is the only one whose shared ground is off the ground.** Follow the
through-line's yard through the five: era one's is **at the centre**, with huts around it; era
five's is **absent** — a wall row has nothing behind it, which is exactly what distinguishes it from
its own era's chain instance; era six's is **explicitly absent** — *"No court"*; era eight's is
**beside** the block, an edged rectangle of lawn the block stands next to; and era nine's is **on
top of the podium**, bounded by the slab on two sides and its own parapet on the others, reachable
only from the flats above. At the locked ~49° camera tilt that is a green rectangle at mid-height
inside the building's own footprint, and **none of the other four can produce it at any azimuth.**

**A third axis comes free and is worth having, because it is the one that survives smallest.** The
number of visible vertical divisions falls monotonically down the lineage: era five and era six read
as **three to five narrow units side by side** — party walls, gables end-on, a chimneystack marking
each house — era eight reads as **one horizontal block with a single gallery stripe** across one
face, and era nine reads as **one uninterrupted slab with continuous balcony banding and no unit
divisions visible anywhere.** Repeated narrow bays, then repeated narrow bays, then one striped
block, then one banded slab on a base. **Era nine is the only member of the lineage in which you
cannot count the dwellings from outside**, which is both the truest thing about late-century housing
and the most legible thing at distance.

### The circular forms — counted, and the count is FIVE

**A previous audit capped one era at three circular forms**, separated by orientation and substance,
on the reasoning that a technical era generates circles naturally — dishes, drums, tanks, rings.
*(That audit is not in the merged tree. It was searched for by wording and by concept across all
twenty era documents, the folder README, the rulings record and era two's locked brief at
`3c08291`, and then searched again at `29ae68c` across the era four, five and six briefs that
landed in between — it is in none of them. **The cap is applied here as it was given, and its
source is unverified.**)*

**Counting circular families that would read as a circle or a cylinder at full zoom-out, across
era nine's eleven buildings, the count is five:**

| # | Form | Where | Orientation | Substance |
| --- | --- | --- | --- | --- |
| 1 | **Satellite dish** | `EL.6`, several | **Tilted**, one shared angle | Open, concave, thin |
| 2 | **Rooftop chiller drum** | `EL.1` on the roof, the hub along the parapet | **Horizontal**, squat, in a repeating rank | Louvred, hollow |
| 3 | **Bulk gas vessel** | beside `EL.3` | **Vertical**, small, in a pair or trio | Closed, solid, seamless |
| 4 | **Spiral ramp** | The Roof Garden, wrapping a corner | **Helical**, climbing | Structural, walkable, a ribbon round air |
| 5 | **Heli-pad** | The Hospital, on the roof | **Horizontal**, flat, no vertical extent | A painted disc read in plan |

**Five exceeds the cap, so two want separating out.** Which two, and how:

**Drop the bulk gas vessels to rectangular form, and the era argues for it independently.** Free
cylinders beside `EL.3` are the least defensible circle in the era, because §1's signature move is
that there is **no visible service** and §4 says everything but six named items is *inside or
underground*. Replace them with a **bunded manifold cage and clad enclosures** — flat-sided boxes
behind a low clad screen with pipework running to the wall — which reads as the era's habit rather
than against it, and still says *bulk gas beside a fab* to anyone reading the plot. **That is the
cheapest of the two removals and it costs nothing the guide wanted.**

**Make the heli-pad a square deck and let the circle be paint.** The era identifies its buildings
*almost entirely by the graphics fixed to them* (§4), so a **graphic** circle on a
**rectilinear** deck is squarely in vocabulary — and a painted marking is not a form, so it does not
enter the count. This also protects the Hospital's silhouette, whose top register is already the
plant screen.

**That leaves three, and they are cleanly separated on the audit's own two axes.** The **dish** is
tilted, open and concave, at ground level, in a fenced group — the era's signature circle and the
one that should stay unmistakable. The **chiller drum** is horizontal and louvred, at parapet level,
in a repeating rank, and it should be **one shared family used identically on every roof that has
one**, so it reads as era vocabulary rather than as a per-building shape. The **spiral ramp** is a
helix at podium scale that wraps air rather than enclosing volume, and it is the only walkable
circle in the era. Tilted disc, horizontal drum, climbing ribbon: no two share an orientation and no
two share a substance.

---

## Defects reported, not fixed

**None of these is corrected here.** Each is a disagreement inside or between the era documents,
found by reading the sections against each other as the folder's known trap class requires.

1. **§3 says nothing in era nine reaches the 24-unit ceiling; the civic file puts The Condominium
   at ~22.** *"Nothing here reaches the 24-unit ceiling; only era ten's mast is authored to approach
   it"* (style guide §3) against *"Height ~22 units, near the `MAX_BUILD_HEIGHT` ceiling"*
   (`civic-buildings.md` §2). Era eight's Apartment Tower says it *"should sit close to the cap"*
   too, so the claim in §3 is about the skill set and reads as being about the era. **The two files
   should agree on which.**

2. **The civic file gives world-unit heights where the style guide forbids them.** §3 states heights
   *"as an order"* and *"deliberately gives no world-unit targets"*, with the mechanical reason: a
   contain-fit means a number is not something a model author can aim at. `civic-buildings.md` gives
   ~10, ~22, ~6/~11 and ~18. **This document uses the civic figures only as the relative order the
   civic file states.** *(Era two's locked brief carries the identical flag for its own two files, so
   this is a folder-wide pattern rather than an era-nine slip.)*

3. **§5's plot list can be read onto era nine's own nodes, and it is not about them.** §5 opens
   *"The plots do not change"* and then gives per-mass plots — *"the workshop has **a single
   tile**"*, *"the store is the long two-cell strip"*. Those are era **one's** node footprints
   (`NUM.3` 1×1, `NUM.F` 2×1), and footprints are keyed by **node id** in `NODE_FOOTPRINTS`, not by
   mass. Era nine's six all resolve to `DEFAULT_FOOTPRINT` 2×2. §5's own next sentences are correct
   and consistent — `EL.3` is *"the same idea at full-plot scale"* — but the plot list above them
   invites the wrong reading, and a footprint is frozen forever once authored.

4. **§5's REFERENCE ONLY banner and the head banner disagree about the landmark.** The head banner
   says the guide still owes **the Town Hall**, and §5's banner says *"the treatment of every other
   mass"* beyond the six the roster uses is reference and *"will not be built."* §5's `landmark`
   entry is the only description of era nine's hub anywhere in the two files. **Read as owed**, per
   the head banner, and briefed as #7 above.

5. **Four eras carry a `dwelling` subtitle with no roster node behind it**, and one of them was
   load-bearing for this brief's own premise. Eras two, three, four and seven each name a `dwelling`
   dressing — the Family Compound, the Gallery Court, the Shop Row, the Brick Terrace — and none of
   the four has a node on `dwelling`. Under the ruling a row *"is needed only for the nodes that era
   INTRODUCES, plus the hall"* (folder README), so these four names are unreachable. **They are also
   counted in the 81-name one-namespace check**, which is measuring more names than the run can
   announce. Era nine is **not** affected: its roster covers all six masses plus the hub, so all
   seven of its dressings have a building.

6. **The era spells *Centre* and *Center* both ways.** *the Data Centre* and the refused
   *Distribution Centre* against the stable hub name *Civic Center*, and the pending rename is
   spelled *Center*. Cosmetic, and it is in the announced name.

---

## Compressed, for prompting

*Every building in three to five sentences. Prepend the theme brief and the constraint list, and
each entry below stands alone. Silhouette, load path, the materials that differ from the era
default, the one detail that has to read, and the single confusion to avoid.*

**the Data Centre** — *skill, `EL.1` on `hall`, 2×2.* A blank clad box with a rank of chiller
drums standing proud of a flat parapet, the plant supplying the whole of a silhouette the box
itself does not have. Frame behind skin, sealed rainscreen over every face, held off the ground by
a shadow gap. **Departing from the era default, it carries no curtain-wall glass at all**, and one
full-height face is aluminium louvre instead of panel. The detail that has to read is that louvred
plant wall against the flat panel either side of it — a striped field in an unstriped elevation,
legible as a grain change at full zoom-out. Do not let it resemble the Headquarters: that building
has a civic frontage and a public entrance, and this one has a service door and nothing else.

**the Office Tower** — *skill, `EL.2` on `tower`, 2×2.* A tall glass prism on a wider stone-clad
base with a lit band at the crown, authored several times taller than it is wide because the plot
cannot supply the proportion. Podium and tower: the base holds the ground, the shaft ignores it,
and unitised curtain-wall units run storey by storey over a frame that never shows. **Engineered
stone on the podium and expressed steel at the entrance canopy are the departures**; everything
above is glass. The detail that has to read is the perfect regularity of the mullion and transom
grid over the full height and around every corner, since an irregular grid reads as an earlier era.
Do not let it resemble The Condominium: this shaft is flush and continuously glazed on a wide base,
where that one is notched by alternating balconies and stands on a single cell with no base at all.

**the Chip Factory** *(merged; until the pass the files read “the Clean Room”)* — *skill, `EL.3` on `workshop`, 2×2.*
A windowless block on a low stone plinth with a projecting airlock snout on one face and a fenced
cluster of bulk vessels against another, the two attachments being its only accents. Frame behind
skin, sealed rainscreen with no opening above the entrance anywhere, flat roof behind an upstand
with a louvred screen and an extract stack. **Engineered stone at the plinth is the only departure,
and the pointed absence is roof lights — this workshop has none, unlike every workshop-mass building
before it.** The detail that has to read is the airlock: a shallow projecting vestibule with a pair
of doors in line and a display panel beside the outer one, because it is the one thing that says
*sealed* and the era's whole argument turns on it. Do not let it resemble era ten's fab shop, which
is the same building one era on: era ten shows its fixings and runs conduit across an elevation on
purpose, and nothing on this box may show a fastener.

**the Research Lab** *(re-authored 2026-07-30; until then it was a logistics shed, and until the
consolidated pass it was “the Parcel Depot”)* — *skill, `EL.4` on `store`, 2×2.*
Two long volumes side by side: a blind two-storey bar of anodised composite panel at the back, and a
single-storey range in front of it at half the height, glazed floor to soffit in the era's unitised
grid, so the pair reads as a step in section. The bar's whole length is **one bay module repeated**,
marked by a panel joint and a flush service riser at every bay, with no window in it anywhere, one
personnel door and one goods shutter at the gable end. Frame behind skin, shadow gap under both
volumes, a flush glazed link closing each end of the slot between them. **The detail that has to
read is the rank of slim extract stacks standing clear of the bar's parapet, one per bay** — plain
capped ducts, all the same, their last storey of riser expressed in the open — because that comb is
the whole of the top edge and it is what says *many experiments at once*. Nothing else is on either
roof, and **nothing else is on the plot**: no tank, no bunded pad, no fence, no trailer, no dock
apron, no planting, no signage band. Do not let it resemble `EL.3`, the era's other windowless
technical building: that is one sealed envelope with one extract stack and a fenced pad of bulk gas
beside it, and this is two stepped volumes with a stack per bay and an empty plot. Keep the bay
spacing dead constant — a rhythm that crowds or halves is a log scale, and this node hosts
logarithms.

**the Glass Apartments** *(merged; until the pass the files read “the Podium Flats”)* — *skill, `EL.5` on `dwelling`,
2×2.* A slab set back on a wider two-storey base, with a green rectangle on the base's roof bounded
by the slab on two sides and its own parapet on the others, and continuous balcony banding down the
slab's long faces. Frame behind skin throughout, balconies cantilevering as a band at every floor,
shadow gaps at the base and the parapet, ramps rather than steps where the base meets the paving.
**The slab's body is composite cladding rather than the era's glass** — the glazing is confined to
the retail base and the lobby — with anodised balcony rails and engineered stone at the retaining
faces. The detail that has to read is that the podium garden is **bounded and reachable only from
the flats above**: it is a shared yard lifted off the ground rather than lost, and if it reads as
landscaping the building has failed the one thing its chain still asks. Do not let it resemble The
Roof Garden, the era's other podium garden: that deck is public, climbed by a ramp and a lift on the
outside, and this court is private and cannot be reached from the street at all.

**the Air Force Base** — *skill, `EL.6` on `yard`, 2×2.* A mesh-fenced plot with a group of tilted
concave dishes rising off concrete pads and one small clad cabin, reading at zoom-out as a rank of
ellipses on stalks over ground that is otherwise entirely flat. It barely stands up and that is
correct: short mounts on pads, a cabin that is a box, and a fence carrying nothing but itself.
**Galvanised mesh and engineered unit paving are the departures, and the pointed absence is
planting — this is the operational version of the mass and the ground is worked, not kept.** The
detail that has to read is that every dish points the same way, one elevation and one azimuth,
because a yard of dishes aimed randomly reads as scrap where a parallel rank reads as a building. Do
not let it resemble era eight's **Power Station** *(was the Substation, and since re-authored into a
building)*, authored in the same sentence shape: era eight's
verticals are open lattice frames rising and these are closed discs tilted.

**the Headquarters** — *hub, `town-hall`, 3×2.* A long clad block behind a glazed civic frontage,
with a rank of chillers along the parapet and a shimmer of warm air above them, wide rather than
tall. A long clear-span volume with its plant in the depth above the soffit, the frontage set
against the clad mass under a deep canopy rather than carved out of it, on an engineered stone
podium. **Curtain-wall glass at the frontage and expressed structural steel at the canopy are the
departures — this is one of only two places in the era where steel may show.** The detail that has
to read is the shimmer: render it as a distortion of the silhouette behind the chillers, never as a
light, a glow or smoke, because it is the ninth link in the *sheltered communal fire* chain and the
communal fire has become waste heat. Do not let it resemble the Data Centre: the frontage and the
public entrance are the whole separation, and this is the one with both.

**The Distribution Center** *(merged; until the pass the files read “The Food Warehouse”)* — *civic, food row, 2×2.*
A long low shed with a continuous dock face, one glazed corner and a roof populated by plant and a
solar array, deliberately banal and contributing nothing to the skyline. Tilt-slab panels under a
profiled steel roof over a clear span, with the glazed corner cut into one end at ground and first
floor and a flush drainage channel across the apron. **It reads as precast concrete rather than the
era's composite rainscreen, which is the one building in era nine that does, and that is exactly why
it looks banal beside its neighbours — keep it.** The detail that has to read is the glazed office
corner and the solar array together, a two-storey glass return with a desk in it and a flat panel
field laid as a texture across the top face. Do not let it resemble `EL.4`: those two features are
the entire separation and neither survives without the other.

**The Condominium** — *civic, livability row, 1×1.* Fifteen storeys of notched shaft on a single
cell, the notch being the silhouette because balconies project on alternating floors only and step
the profile in and out the whole way up, with a louvred screen at the crown. Frame behind skin
straight off a shadow gap with **no podium** — the whole building is the shaft — and balconies
cantilevering from every other floor. **Composite panel in two tones with plate glass at the lobby
and anodised balcony rails; no engineered stone, because there is no base to face.** The detail that
has to read is the double-height lobby with somebody visibly behind a counter in it, since a managed
entrance is what separates this from every earlier dwelling in the run, all of which had a door. Do
not let it resemble era eight's Apartment Tower, which shares its plot, its two-tone panelling, its
balconies, its glazed lobby and its roof plant: era eight's frame reads as structure and its
balconies are continuous ribbons, and this one has no visible frame and a checkered edge.

**The Roof Garden** — *civic, happiness row, 3×2.* A city at ground level and a park on the first
floor: a wide glazed podium carrying lawn, clipped trees and a long water channel on its roof, with
planting spilling over the parapet and a spiral ramp and glass lift climbing the outside. A concrete
podium holds deck planting in engineered soil over waterproofing above a plate-glass retail base
with a station entrance tucked in, the ramp wrapping one corner as a structural helix. **Concrete,
stone paving, glass balustrade and deck planting are the departures, and the tree canopies are the
only ones in the era standing at building height.** The detail that has to read is the level
change — you go up to reach the green, and from the deck you look down on the glass city rather than
along it — so the planting must be visibly *on* something and both the ramp and the lift must read
as ways up. Do not let it resemble the Glass Apartments: this deck is public and climbed from
outside, and that court is private and unreachable from the street.

**The Hospital** — *civic, blend row, 1×2.* A six-storey range lining its street in three
horizontal registers: a glazed entrance level under a deep canopy, four floors behind horizontal
louvre, and a plant screen with a heli-pad above, with the ambulance bay's own canopy as the one
asymmetry. Frame behind skin, the waiting hall glazed the full height of one storey under a canopy
on expressed steel, the ward floors screened, shadow gaps at ground and parapet and ramps at every
level change. **Aluminium louvre and an anodised canopy are the departures from a body of composite
panel and plate glass.** The detail that has to read is the horizontal louvre banding on the ward
floors — the only horizontally banded face in an era that grids everything, and what makes this the
most serious building on its street without a scrap of applied ornament. The confusion to avoid is
not with another building but with a type: a six-storey clad box under a canopy reads as an office,
and the louvre banding and the ambulance canopy are what stop it, so both must be present.

---

## Related

- `era09-information-concepts.jsonl`, in this folder — **the eleven generation prompts for the
  eleven buildings above**, one line per plate, in this document's own building order, each keyed
  to the `out` filename it writes and each carrying the theme brief, the constraint list and one
  entry from *Compressed, for prompting* folded into a single paragraph. It is committed here
  rather than left in scratch because it is the only thing this era's art could be regenerated
  from. Every job is an independent text-to-image call with no image reference embedded, at
  `gpt-image-2`, 1024×1024, quality `high`, `use_case: stylized-concept`. Run it with
  `python3 ~/.codex/skills/.system/imagegen/scripts/image_gen.py generate-batch --input
  output/imagegen/era-09-information-building-briefs/era09-information-concepts.jsonl --out-dir
  output/imagegen/era-09-information-building-briefs --concurrency 3`. **Generation costs money
  and nothing in this folder has been generated yet**, so add `--dry-run` unless a run has
  actually been decided.
- `docs/superpowers/specs/eras/era-09-information/style-guide.md` — the era in one line and its
  signature move, materials, structural language, ornament, the roster, the seven masses, the
  island, the palette, the construction stages, the props kit, the subtitle row and the advisor.
- `docs/superpowers/specs/eras/era-09-information/civic-buildings.md` — the four bought types,
  their footprints, costs and contributions, and the `silicon` resource.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0 — the nine hard constraints
  every era inherits, and §6 for the frozen footprint table.
- `docs/superpowers/specs/eras/README.md` — the naming rule, the one-namespace check, the cross-era
  subtitle table read down a column, and the eleven shared-mass pairs.
- `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md` — R3, the no-re-dress ruling
  this document's cumulative scoping follows from.
- `output/imagegen/era-02-neolithic-building-briefs/README.md` — era two's written and locked
  brief, read here as part of the cumulative confusion set.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produced this document.
