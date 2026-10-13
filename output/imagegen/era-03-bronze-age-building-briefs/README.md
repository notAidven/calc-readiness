# Era 03 — Bronze Age building briefs

Image-generation briefs for the ten buildings era three owes: **five skill buildings**, **the
hub**, and **four civic buildings**. Written with the `era-building-briefs` project skill from
the era's own two documents, plus era one's §0 and the two eras that already stand on this
island:

- `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md`
- `docs/superpowers/specs/eras/era-03-bronze-age/civic-buildings.md`
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0, for the hard constraints
  every era inherits, and §6 for era one's six buildings and the frozen footprint table
- `docs/superpowers/specs/eras/era-01-prehistoric/civic-buildings.md` §2, for era one's four
  civics
- `output/imagegen/era-02-neolithic-building-briefs/README.md`, for era two's ten as generated
- the merged briefs for **eras four, five, six, seven, eight and nine**, all of which scoped a
  cumulative confusion set against era three and committed to an axis for it. **Six of them
  landed while this brief was being written**, so every cross-era pair here was verified twice:
  once against the source guides, and again against those briefs. One premise of this brief did
  not survive the second pass and was rewritten; it is flagged where it happened.

**Eras one and two are not re-briefed and are not owed.** Since the 2026-07-29 re-dressing
ruling a skill building is drawn once and keeps that look for the whole run, so era one's six
and era two's five stay Prehistoric and Neolithic. The only building that rethemes every era is
the hub. **What they are owed instead is separation**, and that is a bigger job here than in era
two: an era-three city has eleven earlier buildings standing on it, so the confusion set is
cumulative rather than sibling-only. It is worked through at *The cumulative confusion set*
below.

**Era three's `dwelling` mass is inert.** `ERA_SEQUENCE` puts no node on it, so **the Gallery
Court is not drawn** and is not briefed. Era two's `dwelling` was inert the same way.

## Verification, before the brief

**Every name below was read from the files at this tip, not carried in.** Era three has **no
pending renames**: the second naming pass of 2026-07-29 is ratified in `style-guide.md`'s
*subtitle row* and nothing in it is in flight.

| Building | Class | Node / role | Mass | Plot | Name read from |
| --- | --- | --- | --- | --- | --- |
| **the Merchants' Hall** | skill | LIN.1 | `hall` | 2×2 | subtitle row, `style-guide.md` |
| **the Bronze Foundry** | skill | LIN.3 | `workshop` | 2×2 | subtitle row |
| **the Treasury** | skill | LIN.4 | `store` | 2×1 | subtitle row |
| **the Ingot Yard** | skill | LIN.5 | `yard` | 2×2 | subtitle row |
| **the Stronghold** | skill | LIN.6 | `tower` | 2×2 | subtitle row — **kept**, the lead named it |
| **the Council Hall** | hub | `town-hall` | `town-hall` | 3×2 | subtitle row — **kept** |
| **The Terraced Fields** | civic | food for ~80, 320 bronze | — | 1×2 | catalogue, `civic-buildings.md` |
| **The Walled Houses** | civic | 80 livability + 20 happiness, 320 bronze | — | 2×2 | catalogue |
| **The Steam House** | civic | 80 happiness, 400 bronze | — | 3×2 | catalogue |
| **The Trading Post** | civic | 40 livability + 40 happiness, 480 bronze | — | 1×1 | catalogue |

**The node ids are clean.** `ERA_SEQUENCE`'s `bronze_age` entry
(`packages/skill-graph/src/eras.ts`) reads `["LIN.1", "LIN.3", "LIN.4", "LIN.5", "LIN.6"]`, and
the roster table pairs exactly those five with `hall`, `workshop`, `store`, `yard` and `tower`
respectively. The footprint closure block pairs them the same way. **No id is crossed against
its mass anywhere in this era**, which is worth stating plainly because era two had three of
five crossed in the equivalent block and era three's `store` subtitle had been written for its
sibling. Both of those were corrected before this brief; the `store` correction is verified
below.

**The era's material id is `bronze`.** Renamed from `ingots` on 2026-07-29 and landed in `#233`
(`civic-buildings.md` §1). **The guides still say *ingots* in twelve places and that is
deliberate, not stale:** every one of them is a physical object — a cast bar on a balance, in a
bay, under a lean-to — and the style guide carries a banner saying so and explaining why a
find-and-replace over this folder would break the era's best framing device. **Ingots on a
balance are a prop; `bronze` is the stockpile.** Nothing in this brief calls the resource
*ingots* and nothing in it renames the props.

**Read the banners.** This era's two files carry AMENDED, RESOLVED, REFERENCE ONLY, RENAMED and
REWRITTEN blocks in place rather than deleting what they supersede, and one live sentence
contradicts the banner four paragraphs above it. See *Findings*.

## The theme brief

*Read once. Every building below inherits all of it, and none of them restates it.*

> **⚑ THE ERA'S PALETTE CHANGED ON 2026-07-31, AND THIS DOCUMENT IS REPAIRED TO MATCH THE ART
> BESIDE IT.** Evan, against `lin-6-stronghold.png`: *"the colour hue of era 3 is too similar to
> era 2."* Era three's body was **mud-brick ochre `#8A6E33`** with **bronze patina `#7F8C6E`** as
> the accent. It is now **bronze patina `#5F6D4E`** in mass with **burnished bronze `#A97740`** at
> the joint — the two states of one metal, since bronze goes green where it is left alone and
> stays brown where a hand touches it. **The ten images in this folder were regenerated onto the
> new pair the same day and are what era three looks like**; the superseded ochre ten are kept in
> `output/imagegen/era-03-ochre-superseded-2026-07-31/`.
>
> **The reason moved with the number, which is why five passages below are rewritten rather than
> hex-swapped.** The old body separated from the era's grey dry-laid stone **by warmth** — a warm
> ochre mass on cool grey — and a patina mass is itself cool, so that mechanism is simply gone.
> What separates them now is **value first**: at **L\* 44.1** the patina is the darkest body in
> the first six eras, eighteen points below era one's terracotta, and the Art Bible's face blends
> are monotonic, so the darker material stays darker on all three faces rather than only on the
> ones that happen to face away. **Saturation second**: the stone is effectively colourless where
> the wall holds **C\* 19.3** of green. Warm-against-cool is still true in exactly one place and
> has moved there — **between the burnished fitting and the wall it is fastened to**. The
> derivation is in `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md`'s palette
> section.
>
> **Every remaining "ochre" below sits inside a description of ANOTHER era's brief** — three rows
> of the later-briefs table and Findings 9 — and those are quoted rather than stale here. They are
> owed to their own owners and are marked where they appear.

Era three is **a trading town that has learned to cast metal, and puts it wherever two things
meet.** The signature move is that placement: bronze arrives **at the junctions** — a strap
round a door post, a pin through a timber lap, a hinge, a cap over the exposed end of a beam,
sheathing on the leaf of a gate, a collar where a post enters its stone socket. Era one lashed
its joints with cordage and era two hid them inside the thickness of a wall; this era covers
them and then draws the eye to the cover, so **the joint is the decoration** and no surface is
ever patterned for its own sake. **This is the first metal anywhere on the island, and it has to
read as an event rather than as a texture** — which makes it a rule about rationing before it is
a rule about placement. Eras one and two withheld metal for three eras between them, and era two
went as far as forbidding a crank pin and a bucket hoop on a well so that this arrival would
land; **an era where everything is faintly metallic spends that saving and buys nothing with
it.** So bronze is small in area, high in contrast, dulled and slightly uneven — **a burnished
warm brown, never polished and never gold** — and it is **rationed building by building**,
as the table below sets out. **The green of the patina is the wall's now and not the fitting's**,
which is the one thing the 2026-07-31 palette moved in this paragraph: bronze goes green where it
is left alone and stays brown where a hand touches it, and every fitting this era draws is a
surface a hand touches — a strap, a hinge, a stud, a gate leaf, a collar at a post foot.
*(`style-guide.md` §2's materials row still describes cast bronze as "a warm brown-green patina",
and that is the material in general; the palette section is the ruling on which of its two states
goes where.)* **Four materials and no more:** mud brick in mass, in far greater thickness than era
two, walls deep enough to corbel over, reveals kept deep; cast bronze at joints and fittings only;
timber in **squared** sections now rather than era one's round poles, strapped in bronze at every
lap, for framing, roof structure, gates, hoists, walkways and shear-legs; and roughly squared
stone **laid dry** at footings, plinths, thresholds, revetments and the quay — squared but
undressed and set without mortar, so the joints stay visibly uneven. **The stone is pale and
colourless against a body that is neither**, and it separates from the patina mass on value and on
saturation rather than on warmth, since both materials are cool now.
**Absent on purpose, each because it is a later era's
signature move:** lime mortar and the true arch, both Classical; fired roof tile; coursed
ashlar; iron, which belongs to the Industrial era; and glass, which waits for the Renaissance.
**Buildings stand up by mass, and mass is now expressive rather than merely a fact.**
Corbelling is the structural signature — courses stepped progressively inward to close a space
overhead or to carry an upper storey out past the one below — and **the steps must read as
steps**, because there is no arch and no keystone anywhere in this era. The batter returns more
strongly than in era two, since a wall this thick is built wider at its base than at its head,
and it reads as weight, which is the era's whole affect. A squared timber beam on a row of posts
spans what masonry cannot, with the metal marking exactly where the load transfers. The run's
**first upper storey people stand on** appears here — a timber gallery along one side of a
courtyard, a walkway carried across a tower head — and where a walkway crosses, its bearers
project through the wall and are left showing. Openings stay small and lintelled but are more
numerous and much deeper, the reveal now as thick as an arm's length, which is free shadow and
does more for a silhouette than another shape would. Roofs go by plan: timber-and-reed cones
over the drums, low ridges over the rectangles, awnings on posts over working ground, and the
era's one refinement, a **shingled timber canopy**, which is a tiled roof made of split wood.
Ground is **metalled rather than paved** — rammed gravel and stone chips with kerbstones — so
routes read as constructed while the surface stays granular; fitted slabs belong to era four.
**One body hue for the whole era, bronze patina `#5F6D4E`**, with burnished bronze `#A97740` as
the accent, sitting on the calm parchment ground `#ECE4D3` rather than competing with it;
buildings share the body hue and differ by **silhouette plus accent**, never by a second body
colour. **The mud brick is stained the muted grey-green of patinated bronze and is still matte
brick** — weathered, never painted, never metallic and with no sheen — and the fittings are the
warmer, brighter note against it, which is the whole reason the pair is two states of one metal.
**It is the darkest body in the first six eras, and that is what carries the mass against the
ground:** ΔE76 48.43 from the parchment, still the largest of any of those six. **Ornament is low
and it is the fitting** — a strap, a boss, a stud, a cap on a beam end, a collar at a post foot, a
hinge left large enough to see — beside which the era supports
exactly two flat devices: the **corbel course**, which is ornament and structure in one move,
and a little impressed work in brick, a chevron or a rope moulding under an eaves line. Nothing
carved, nothing painted, no figure work.

### How the era spends its metal

*This is the theme brief's organising idea, and it decides which buildings show bronze and which
do not. Metal goes where a hand touches the building, where a load transfers, or into a person's
hand as an object — and nowhere else. Never on a wall field, never on a roof, never in the
ground.*

| Building | What bronze it carries |
| --- | --- |
| **the Treasury** | **The densest concentration in the era, on one door and nothing else.** Lock, hinges, studs, sheathing on the leaf. Every other face is blank mud brick |
| **The Trading Post** | **The era's metal in the hand:** the great balance beam and its pans, the graded weights on the shelves |
| **the Merchants' Hall** | Two sheathed and strapped door leaves, swung open against the wall so the metal is what a cart passes between |
| **the Council Hall** | The court gate's fittings, and the bellows at the hearth. Nothing on the court walls |
| **the Bronze Foundry** | **Metal as product rather than as fitting** — ingots, sprues, offcuts, a crucible in tongs. Its own fabric gets one strap per timber lap and no more |
| **The Steam House** | The door fittings and the furnace door. `civic-buildings.md` calls these *the first visible cast-metal fittings* in the civic catalogue, which is true of that catalogue and not of the era |
| **The Walled Houses** | **One gate, and that is all.** A single strapped leaf in a blank enclosing wall |
| **the Ingot Yard** | **Not one strap in its fabric**, because it has almost no fabric. All of its metal is loose objects on the ground: a hand balance, the graded weight set in its chest, cast bars |
| **the Stronghold** | **No metal on any face you can see from outside the wall.** One barred and strapped door on the inner face, because that is the only side anyone reaches it from |
| **The Terraced Fields** | **None. Anywhere.** A field does not get fittings, and one building with no metal at all is what makes the ration legible on the other nine |

### Constraints that bind every image below

- **Three tone steps per surface under one key light** — top face lightened, the hue on the
  left, the right darkened. **No runtime lights**: no cast shadow, no ambient occlusion, no
  specular highlight, no rim light, no gradient. Never describe a building by light falling on
  it. This bites hardest on bronze, which is the era's one high-contrast material: it survives
  zoom-out as **glints along an edge**, and a glint here is a lighter tone step on a small
  face, never a highlight.
- **Emitted light is an emissive surface inside that model, never a light added to the scene.**
  The smelting hearth mouths, the furnace door, a crucible of hot metal: the surface itself is
  bright and it lights nothing around it. No warm pool on the ground, no glow on a bellows, no
  reflection in the slag.
- **Footprints are frozen** (INV-ERA-1). Design to the plot named in each brief; never change
  which cells a building occupies.
- **Height is a ranking, never a world-unit target.** A model is contain-fit to its plot by one
  uniform scale, so the more slender of two neighbours is simply the taller one, and a smaller
  plot shrinks a model whole rather than making it look tall. **Slenderness is a property of the
  model, not of the plot.** Nothing here approaches the 24-unit ceiling.
- **The mesh fills 95% of its footprint span.** A building is sized to its plot, not floating in
  it.
- **Every building is modelled at its finished (`built`) stage.** Not `site`, not
  `construction`, and not a mastery variant — mastery rides above a building as stars. **In this
  era that has a specific consequence:** lashed shear-legs are the `construction` stage's dating
  device, and **shear-legs standing on a finished plot read as a building still going up.** Keep
  them off every model below.
- **Mastery gold `#FFB703` is reserved.** It may never be a material and a body is never gold.
  Bronze is the era's whole identity and it must not reach for gilding. **The 2026-07-31 palette
  is what makes this a live caution rather than a formality**: the fitting is now *burnished*
  rather than patinated, so the accent is the warm bright note on the wall and is the one surface
  in the era that could drift toward gold. `#A97740` is what keeps it short of that — dulled and
  uneven, ΔE76 50.6 from `#FFB703`, at half its chroma and 25 L\* below it.
- **Every side must read.** The camera orbits a full 360°, so there is no front and no hidden
  back. A building whose metal is all on one leaf still needs the other three faces to carry the
  batter, the reveals and the corbel course.
- **No rebuses.** A skill building is ordinary architecture that happens to house a lesson and
  never symbolises it. **This era has the sharpest case in the run, and it is the balance.** A
  balance beam is very nearly a picture of an equation, so: never two sides of an equation, never
  matched loads carried for the sake of symmetry, never a beam balanced level as a symbol. Give
  every balance a real job and an off-centre load. And nothing anywhere may **count**: no tally
  of corbel courses, no ingots stacked in rows that read as an arithmetic, no bays counted out
  along a length.
- **Nothing carries meaning by art alone.** The canvas is `aria-hidden`; every state a player
  must know is already in the DOM.

## The ten buildings

| # | Building | Class | Node / role | Plot |
| --- | --- | --- | --- | --- |
| 1 | the Merchants' Hall | skill | LIN.1, `hall` | 2×2 |
| 2 | the Bronze Foundry | skill | LIN.3, `workshop` | 2×2 |
| 3 | the Treasury | skill | LIN.4, `store` | 2×1 |
| 4 | the Ingot Yard | skill | LIN.5, `yard` | 2×2 |
| 5 | the Stronghold | skill | LIN.6, `tower` | 2×2 |
| 6 | the Council Hall | hub | `town-hall` | 3×2 |
| 7 | The Terraced Fields | civic | food | 1×2 |
| 8 | The Walled Houses | civic | livability | 2×2 |
| 9 | The Steam House | civic | happiness | 3×2 |
| 10 | The Trading Post | civic | blend | 1×1 |

**The height ranking below is derived, and the derivation is a finding.** `style-guide.md` §3
gives the era's order over the *chain* dressings — gate tower, assembly rotunda, furnace court,
bonded store, courtyard house, casting workshop, weighing yard — and six of those seven are
REFERENCE ONLY under the re-dressing ruling and will never be built. **None of the five
buildings this era owes appears in the guide's own ranking.** The order used here is derived
from §5's stated scale-and-props separations between each roster building and its chain
sibling, and from the civic file's figures read as order only. Tallest first:

**the Stronghold · The Steam House · the Council Hall · {the Walled Houses, the Merchants'
Hall} · the Treasury · The Trading Post · the Bronze Foundry · The Terraced Fields · the Ingot
Yard.**

---

### 1. the Merchants' Hall — LIN.1, `hall` mass

**Plot: the square full plot, 2×2 (8×8u),** decided for LIN.1 in the guide's closure block. A
room you drive through rather than a room you walk along, so the two openings sit on opposite
sides and the plan is square rather than long.

**Silhouette.** One long low timber ridge over a plain battered mud-brick box, with a wide
square-headed opening at each end and **both door leaves swung back flat against the wall**, so
you see straight through the building from end to end and the central row of posts stands in
that view. One dominant shape, one accent: the ridge, and the two bright leaves folded open.

**How it stands up.** Load-bearing mud-brick walls with a strong batter, thick enough that each
door reveal is an arm's length deep. The ridge is carried on **a central row of squared timber
posts down the middle of the room**, capped and strapped in bronze at every lap, with the metal
marking exactly where the load transfers — that row is visible through the openings and it is
the reason the span works at all. A squared timber lintel over each opening, with a corbelled
relieving head of stepped courses above it.

**Materials and ornament.** Mud-brick body, a low timber ridge on squared rafters, a dry-laid
squared-stone plinth and thresholds. A corbel course under the eaves the full length. Bronze on
the two leaves, their hinges and their studs, and on every post cap; nothing on the wall fields.

**The detail that has to read: the two leaves standing open.** Sheathed, studded, hinged large
enough to see, folded flat against the brick. They are the metal at the one place a hand and a
cart touch the building, and they are what a viewer reads this era by.

**Props.** **The first wheeled cart on the island** — a loaded two-wheeled cart standing in one
doorway, with its ruts worn into the metalled ground and a spare wheel leaning on the wall.
Corded bales and tall jars inside along the walls. A cast bronze plate with a punched mark
riveted to a door post, and the same mark cut into the stone plinth beside it.

**Per D-ERA8** the hall hosts LIN.1 and says nothing about it. No balance anywhere on this
building — the balances are the Trading Post's and the Ingot Yard's — and the bales and jars are
of unequal size and stacked unevenly, so nothing on the plot can be counted.

**Height.** Level with The Walled Houses, above the Treasury, below the Council Hall. Length and
the ridge do the work; it is a long low hall and not a tall one.

**What it must not resemble.** **Era two's Meeting House (RAD.3, `hall`, 2×2) — the sharpest
cumulative pair in this era, because it is the same mass on the same plot and both are long
ridged halls you see through end to end.** They separate on **props and grain, never geometry**:

| | the Merchants' Hall (era 3) | the Meeting House (era 2, standing) |
| --- | --- | --- |
| Ends | Hinged **sheathed leaves** swung open against the wall | **No leaf at all**, and there could never be one — metal is absent from era two by rule |
| Roof | A low **timber** ridge, split-shingle where it is covered | **Combed thatch**, read as direction |
| Props | **A loaded cart stands in the doorway** | No cart anywhere: era two's wheel is rotation only |
| Wall | Strong batter, deep reveals, a corbel course | Batter much reduced, square corners, a projecting brick course |

It must also not resemble **era one's Family Lodge (civic, 2×2)**, which is likewise one long
ridged roof on the square plot. They separate on **aperture and scale**: the Lodge has a
**single** doorway and low eaves nearly touching the ground; this hall is open at both ends with
eaves high enough to drive a cart under. **A claim in circulation needs correcting here:** the
Family Lodge is *not* see-through — `era-01-prehistoric/civic-buildings.md` gives it one doorway
— so the end-to-end view is shared with era two's Meeting House alone, and that is the pair that
needs the table.

---

### 2. the Bronze Foundry — LIN.3, `workshop` mass

**Plot: the square full plot, 2×2 (8×8u),** decided for LIN.3 in the closure block. Room for a
working floor, two hearths and a spoil behind them, which a single tile could not hold.

**Silhouette.** A deep open-fronted shed of thick mud brick under a low shingled timber canopy,
with **two hearth mouths side by side against the back wall** and two plumes leaving the roof,
and a spoil of slag running downhill off the plot's edge behind it. Squat and busy: it fills its
plot and rises barely above it, which is what keeps it a working floor.

**How it stands up.** Three thick mud-brick walls carry the canopy at the back and the sides;
the front is **a row of squared timber posts on dry-laid stone pads with a strapped beam across
them** — post and lintel, and emphatically not a colonnade, since the repeated bay in stone is
era four's signature and must not be spent here. The canopy is split shingle on squared rafters.
The hearths are **built masses of brick standing against the back wall** with clay-lined bowls,
not pits dug into the floor.

**Materials and ornament.** Mud brick, split-shingle canopy, squared timber posts, dry-laid
squared-stone pads and threshold. One strap at every timber lap and no other ornament; the brick
above the hearths is smoke-stained, and that is the only surface incident the building gets.
**No board of stamped weights anywhere on it** — that belongs to the chain's casting workshop
and its absence here is half of what separates the two.

**Emitted light.** The two hearth mouths and a crucible of hot metal, as emissive surfaces
inside the three-tone model: bright in themselves, lighting nothing. No glow on the bellows, no
warm pool on the floor, no light in the slag.

**Props.** Two sets of bellows. A crucible held in tongs. A two-piece stone mould shown open and
shut, and a rack of moulds of unequal size against the back wall. A charcoal heap under matting
in a lean-to store. Ore in baskets. **The slag spoil going glassy** as it runs downhill — the
first genuinely industrial scar the island has. A scatter of casting offcuts and sprues where
the metalworkers sit.

**Per D-ERA8** the shop hosts LIN.3 and illustrates nothing about it: the racked moulds are of
unequal sizes and part-used, never a graded set laid out in order.

**Height.** Among the lowest roofed buildings in the era, below the Treasury and above the
Terraced Fields and the Ingot Yard. It is more substantial than the chain's single-tile casting
workshop, and **scale is the axis §5 gives that pair** — this is the production shop, two
hearths and a spoil, where the chain's is a squat single-tile floor.

**What it must not resemble.** **Era four's Stonecutters' Shop (POL.1, `workshop`), and the
separator is fire.** Era three's shop has two hearth mouths, bellows, a charcoal store and a
slag spoil; era four's mason's shop has **no fire at all** — blocks on trestles and chisels
racked against a back wall. The second tell is the front: era three's is squared timber posts
under a strapped beam, era four's is a stone colonnade.

It must also not resemble **era two's Potter's Kiln (RAD.1, `workshop`, 2×2)**, the other
sharp cumulative pair on this mass — same plot, both fire under a roof, both open-sided. They
separate on **plan and props**: era two's fire is a clay-lined **pit sunk into the ground** with
a single plume, under a thatch shelter that is mostly roof and air with one low screen wall;
era three's fires are **two built hearths standing against a thick back wall** under a
split-shingle canopy, with three real walls and only the front open. And era two carries no
metal by rule, so a strapped timber lap or a cast bar on the floor dates this building by
itself.

Finally, it must not resemble **the Council Hall (#6)**, the era's own other fire under a
canopy. They separate on **enclosure and scale**: this is a shed you look into from the front,
2×2; the Council Hall is a walled court, 3×2, whose hearth stands in open air with only part of
the court covered.

---

### 3. the Treasury — LIN.4, `store` mass

**Plot: the long two-cell strip, 2×1 (8×4u),** decided for LIN.4 in the closure block — a run of
bays behind a counter is the long plot's own shape. *(This is the one plot in the era that
disagrees with the code; see* Findings *5.)*

**Silhouette.** A long low blank box of very thick mud brick under one low ridge running the
full length, with **one door and nothing else** — no window, no bay, no opening of any kind
anywhere along the length — and that door the only bright thing on the building.

**How it stands up.** Load-bearing mud brick at its greatest thickness in the era, battered hard
at the base, standing on a dry-laid squared-stone plinth. A low timber ridge on squared rafters.
The single opening is square-headed under a squared timber lintel, its reveal an arm's length
deep, with a corbelled relieving head of stepped courses above the lintel taking the load off
it. **The steps read as steps; there is no curve over this door.**

**Materials and ornament.** Mud brick, a low timber ridge, a dry-laid squared-stone plinth and
threshold. A corbel course under the eaves the full length, and it should be the era's best
because **this is the longest unbroken wall era three draws.** Bronze on the door and nowhere
else: a sheathed leaf, big studs, hinges left large enough to see, a lock plate, and a cast
plate with a punched mark riveted to the post beside it.

**The detail that has to read: the blankness.** The whole building is one long wall carrying one
door. Three faces are unbroken brick with the batter and the corbel course and nothing at all
besides — and because the camera orbits, those three faces are most of what anyone sees.

**Props.** A cart drawn up at the door, ruts worn into the metalled ground. A stack of squared
stone blocks sorted by size. Corded bales and tall jars waiting outside the threshold, never
inside a bay — nothing stored is visible. No barred gate: this building's opening is a **leaf**,
not a gate, and the barred double leaf in the props kit belongs to the Council Hall.

**Per D-ERA8** the store hosts LIN.4, which is compound inequalities, and it says nothing about
them. Nothing paired, nothing bracketed, no two-of-anything set either side of the door.

**Height.** Level with era two's raised store rather than above it, because the height era two
put into stumps this era puts into wall. Above the Trading Post and the Bronze Foundry, below
the Merchants' Hall.

**What it must not resemble.** **Era four's Wine Cellars (POL.4, `store`) — same mass, adjacent
eras, both bonded and shut, and era four separates them on arch against lintel.** Era three has
to hold its side of that and it is the reason this door is described so exactly: **one
square-headed opening under a squared timber lintel with a corbelled relieving head**, in mud
brick on a dry-laid plinth. Era four's is a row of **barrel-vault mouths** opening onto a
**raised loading platform** in mortared ashlar. The second tell is the platform: era three has
none, and its threshold meets metalled ground flush.

It must also not resemble **era two's Seed House (EXP.1, `store`, 2×1)**, the same long plot and
the era's other store boarded shut on every side. They separate on **lift**: era two's is a box
held **up in the air** on stone stumps with daylight showing right under the floor, and that gap
is half its silhouette; era three's sits **on the ground** on a dry-laid plinth with its walls
running down into it. A box in the air against a box on the ground holds at any zoom.

**The chain's own bonded store is not drawn**, so that pair never stands on the island — but
§5's axis for it is worth carrying, because it is what makes this building's read deliberate: a
shed you can see into against a shed you cannot. The chain's keeps one long open bay under a
projecting eave with goods and a counter in it. **This building has no open bay of any kind.**

---

### 4. the Ingot Yard — LIN.5, `yard` mass

**Plot: the square full plot, 2×2 (8×8u),** decided for LIN.5 in the closure block, because it
is a working ground you stand in the middle of.

**Silhouette.** **Ground, and four objects on it.** A kerbed apron of metalled gravel filling
the plot, open to the sky with no roof, no awning and no fence, carrying a low stone weighing
table, a hand balance on a trestle, a banded chest and stacked cast bars — and **nothing on it
rises above waist height.** The read is the plan, which is what the three-quarter overhead camera
sees best.

**How it stands up.** It barely does, and that is correct. The apron is rammed gravel and stone
chips edged with dry-laid kerbstones set at ground level. The weighing table is a slab of
roughly squared stone on two dry-laid supports. The trestle is squared timber, strapped at its
lap. Nothing on the plot is founded and nothing is roofed.

**Materials and ornament.** Roughly squared dry-laid stone for the table and the kerb, squared
timber for the trestle, metalled ground. **Not one strap in the fabric**, because there is
almost no fabric: this building's metal is entirely objects — the balance's beam and pans, the
graded weights with their values punched into the top face, the cast bars. **Ornament: none.**
There is no wall to carry a corbel course, and that absence is part of the read.

**Props, which are most of the building.** Cast bars stacked unevenly and a few loose. The
graded weight set in its banded chest with the lid open. A hand balance on the trestle **with an
off-centre load and the beam tipped.** Ore in a basket. A mark cut into a kerbstone. Cart ruts
crossing the apron.

**Per D-ERA8, and this is the sharpest case anywhere in the run.** A balance beam is very nearly
a picture of an equation, so the beam **tips**, the pans hold different things, nothing is paired
for symmetry, nothing is counted, and the bars are of unequal size. It is a weighing yard
because a trading town weighs things and a public scale has to be seen to be believed — give it
a real job, off-centre load and all.

**Height.** **The lowest thing era three draws, and this plot never rises in any of the ten
eras.** Level with era two's Sheep Pen, which holds the same bottom of the band, and below the
chain's weighing yard — that one has an awning and this one has nothing, which is exactly the
axis §5 gives the pair.

**What it must not resemble.** **Era four's Barracks (POL.2, `yard`) — same mass, adjacent
eras, both working yards heaped with the material their era is about.** They separate on **grain
and props**: era three's material is cast bronze bars and roughly squared grey stone laid dry;
era four's is **pale sawn ashlar stacked in courses.** And **shear-legs are era three's own
hoist** — the dating device of its `construction` stage — which is why era four's Barracks was
left to carry one and **this yard carries none.** That is doubly right: §5 allows nothing on
this plot above waist height, and a shear-legs standing on a finished era-three plot would read
as a building still going up.

It must also not resemble **era two's Sheep Pen (RAD.2, `yard`, 2×2)**, the same plot and the
same roofless working ground with nothing standing on it. They separate on **boundary**: era
two's *is* a fence — a continuous run of hurdling round the whole plot, narrowing into a race
and a catching pen, so the plan is the whole building; era three has **no enclosure at all**, and
its edge is a line of kerbstones in the ground. A fence against a kerb.

And it must not resemble **The Trading Post (#10)**, the era's other balance. They separate on
**scale and enclosure**: this is 2×2 of open ground with a small hand balance among objects at
waist height; the Post is a 1×1 walled box under a projecting canopy with a **great** beam
under it. Open ground against a shut building, and a hand balance against a great one. *(The
era's naming pass fixed the name collision between these two and left the form collision
standing; see* Findings *8.)*

---

### 5. the Stronghold — LIN.6, `tower` mass

**Plot: the square full plot, 2×2 (8×8u),** decided for LIN.6 in the closure block, because era
one measured that a smaller plot makes a tower shorter rather than more slender.

**Silhouette.** A stout square block of battered mud brick on a footing of dry-laid undressed
stone, **wider at its head than at its base** because the parapet corbels out on courses stepped
progressively outward — and **nothing on the outside to climb**: no stair, no ladder, no
walkway, and no opening above the footing on any outward face.

**How it stands up.** Dry-laid roughly squared stone footings carry a solid battered mud-brick
shaft. The parapet is carried out past the shaft on stepped courses and it is **solid** — a
continuous wall with no crenellation, no merlon and no embrasure, because era three's ornament is
the fitting and nothing in it cuts a wall into teeth. The corbel steps must read as steps. The
tower stands at an angle of the terrace revetment, so the dry-laid revetment runs into its
footing on two sides and the ground drops away below it.

**Materials and ornament.** Mud-brick shaft, dry-laid undressed stone footing and revetment, and
**one barred and strapped timber door on the inner face** — the only metal on the building,
because the inner face is the only side anyone reaches it from. **The corbel course carrying the
parapet is the ornament**, and this is the era's clearest single instance of ornament and
structure being one move.

**Props.** A stack of squared blocks at the foot. A kerbed metalled route running past on the
inner side. A mark cut into a footing stone. **Nothing at all on the outward faces** — that
emptiness is the building's argument.

**Per D-ERA8** the tower hosts LIN.6 and says nothing about it. Do not let the corbel steps
become countable, and do not set anything at measured intervals along the parapet.

**Height.** **The tallest thing era three draws**, and it earns that from the model's
proportions rather than from its plot, which is the same square the hall and the yard stand on.
It is markedly stouter than the chain's gate tower, and scale is the axis §5 gives that pair.

**What it must not resemble.** **Era five's Tower House (RAT.4, `tower`) — both stout masonry
blocks with a corbelled parapet, and plan will not separate them because both are blunt
squares.** The separator is **props**: era three's is **reached only from inside** and carries
nothing on its outward faces, where era five's whole read is its **external forestair** to a
first-floor door. Second tell, **grain**: era three is a mud-brick shaft on a dry-laid undressed
footing, era five is coursed rubble throughout. Third, and era three must hold it: **era three's
parapet is solid where era five's is battlemented.**

It must also not resemble **era two's Stone Tower (RAD.4, `tower`, 2×2)**, the same plot and the
other solid-mass tower you cannot climb from outside. They separate on **plan and props**: era
two's is a true circular **drum** tapering as it rises under a low domed cap, with **a heaped
earth ramp running up its back**; era three's is a **square block that widens at the top**, with
no ramp and nothing on the outside. A circle with a ramp against a square with a corbelled head
holds at any zoom.

**The chain's gate tower is not drawn**, so that pair never stands — but §5's axis for it must be
respected anyway, because it is what era three does for the tower chain: solid head against open
head. **The external timber walkway with its bronze-strapped bearers showing, and the ladder to
it expressed outside, belong to the chain. This tower has neither.**

---

### 6. the Council Hall — the hub, `town-hall`

**Plot: the wide plot, 3×2 (12×8u).** The era's landmark and unique by right, and **the one
building in the city that rethemes each era** — so era one's and era two's hubs both still stand
beside this one.

**Silhouette.** A rectangular **walled court** of battered mud brick with a shingled timber
canopy on heavy posts over part of it, a smelting hearth standing in the open air inside, and a
barred bronze-strapped double gate in the wall — so at zoom-out it reads as **an enclosure you
cannot see into except through the gate**, with one plume rising out of it. Wide rather than
tall; its authority comes from width, wall thickness and being the only walled court in the era.

**How it stands up.** A continuous battered mud-brick wall encloses the court on all four sides,
thick enough for deep reveals and headed with a corbel course. Heavy squared timber posts inside
carry a split-shingle canopy over part of the court, capped and strapped at every lap. The hearth
is a built mass of brick with a clay-lined bowl on a dry-laid stone base. A squared timber lintel
over the gate with a corbelled relieving head above it.

**Materials and ornament.** Mud-brick walls, split-shingle canopy, heavy squared timber posts,
dry-laid squared stone at the gate threshold and the hearth base. Cast bronze on the gate — a
barred double leaf with studs and hinges, **shown with one leaf open so the fittings read from
both sides**, which is what the props kit asks of this era's gate. The corbel course round the
wall head, and the brick smoke-stained above the hearth.

**Emitted light.** The hearth mouth and a crucible, as emissive surfaces inside the model,
lighting nothing. **The communal fire has become the town's industry, and that is the clearest
single statement this era makes:** era one gathered round a hearth to eat, era two enclosed the
fire in an oven to bake, and here the same fire is what the settlement's wealth is made out of.
**The walls are the new part** — a fire this valuable is something you now keep.

**Props.** Bellows at the hearth, a charcoal heap under matting, ingots stacked in a lean-to
against the inner face, a slag spoil at the wall's foot outside, a two-wheeled cart at the gate,
and a cast bronze plate with a punched mark riveted to the gate post. **No balance anywhere** —
the two buildings that own a balance are #4 and #10, and a third would dilute both.

**Height.** Third of the ten, above The Walled Houses and below The Steam House, but read as the
**heaviest** thing on the island rather than the highest.

**What it must not resemble.** **Era two's Bread Oven (civic, happiness, 2×2), which is the one
other permanent communal fire standing when era three is current.** Civic buildings are frozen in
the era they were built and never removed, so era two's oven is still there. They separate on
**enclosure**: era two's is a raised built dome of fired clay standing in the open on a swept yard
with nothing over it, dominant and unroofed; era three's fire is a smelting hearth standing inside
a walled court with a canopy over part of it. A dome in the open against a hearth behind a wall.

And **The Steam House (#9)** — see the table there. Both stand on the wide 3×2 plot and both are
read by a fire and a plume, which makes them the era's sharpest internal pair.

> **Era one's Stone Circle and era two's Shrine are NOT standing, and that changes what this
> building has to do.** The hub is the one building in the city that rethemes, so **there is
> exactly one landmark on the island and in era three it wears this era's clothes.** Era five's
> merged brief states it directly — *"Era one's Stone Circle, era two's Shrine, era three's
> Council Hall and era four's Senate House are **not** standing"* — and era four's says the same
> from its own side. So the earlier hubs are not neighbours to be told apart from; they are
> **the same building's previous looks**, and what the Council Hall owes them is legibility as
> the next step rather than separation.
>
> | | Era one — the Stone Circle | Era two — the Shrine | **Era three — the Council Hall** |
> | --- | --- | --- | --- |
> | Boundary | A ring of upright undressed stones with gaps you look through | **No walls at all**, open air between the posts | **A continuous battered mud-brick wall** with a barred gate |
> | Fire | An open stone hearth in a ring | A **domed clay oven** with a mouth and a flue | A **smelting hearth** with bellows and a slag spoil |
> | What changed | The settlement gathers round it to eat | It is enclosed, to bake | **It is walled, because it is now what the town's wealth is made of** |
>
> A player watching one plot through three eras should read that progression, so the wall and the
> smelting hearth both have to be unmistakable against the memory of an oven under a canopy.

---

### 7. The Terraced Fields — civic, food *(1×2)*

**Plot 1×2 (4×8u), the two-cell strip on the short axis. Cost 320 bronze, food for ~80.** It
wins on resource efficiency and loses because it is mostly ground with no vertical presence at
all — which is a fact about the design, not a licence to under-draw it.

**Silhouette.** Two stepped shelves of packed earth held by low dry-laid undressed stone
retaining walls, planted in rows, with a water channel along the upper lip and **the timber
sluice frames the only thing standing on the plot.**

**How it stands up.** The retaining walls are roughly squared stone laid dry, waist-high at most,
battered slightly back into the earth they hold. The terraces are packed earth levelled behind
them. The channel is cut along the upper lip and the sluice gates are squared timber in squared
timber frames.

**Materials and ornament.** Dry-laid undressed stone retaining, packed earth, squared timber
sluices. **No bronze anywhere on this building, and that is deliberate** — it is the one building
in the era carrying no metal at all, which is what makes the ration legible on the other nine.
So the sluice gates are timber pegged into timber, with no strap and no pin. Ornament: none.

**Props.** Crops in rows, unequal and part-picked. A hoe leaning on the wall. Water standing
shallow in the channel. A basket at the step. Ground damp and dark along the channel, dry at the
outer lip.

**Height.** Second lowest of the ten, above only the Ingot Yard. Nothing on it rises except the
two sluice frames.

**What it must not resemble.** **The island's own terracing, which is the risk specific to this
era and the easiest one here to miss.** `style-guide.md`'s island section terraces the worked
plots where the ground slopes and holds them with **low stone revetments**, so on this island a
stepped shelf behind a dry-laid wall is now ordinary landscape. This building has to read as a
**cultivated plot** rather than as a piece of ground: keep the two steps equal and deliberate,
the rows straight and planted, the channel and the sluice frames present, and the retaining wall
coursed straight-ish and squared where the island's revetments are rougher and follow the slope.

It must also not resemble **era two's Sheep Pen (RAD.2, `yard`, 2×2)**, since both are low
bounded ground with nothing standing on them. They separate on **grain and props**: crops in rows
on stepped earth against bare hoof-churned ground behind woven hurdling — and the Pen's boundary
*is* the building where this one's retaining wall is doing structural work. Nor **era one's
Clearing (`yard`, 1×2)**, the same plot shape and also mostly not a building: era one's is swept
earth with a hearth ring, two boulders and one tree, where this is levelled, retained, channelled
and planted.

---

### 8. The Walled Houses — civic, livability *(2×2)*

**Plot 2×2 (8×8u). Cost 320 bronze, 80 livability + 20 happiness.** The 20 happiness **is** the
enclosed court, and the catalogue is explicit that it is a *private* amenity the residents have
to themselves — so the court must read as enclosed from outside, not as a shared way through.

**Silhouette.** Three ranges of mud brick on **a single planned wall line**, flat-roofed and used
as living space, closing a court with **one gated entrance** and no other opening at ground
level — a solid square of building with a private void in the middle and a stair up to the roof.

**How it stands up.** Load-bearing battered mud brick on a dry-laid stone plinth. **Flat
packed-earth roof terraces on close-set squared timber beams**, which is the era's usable roof.
A stair up from the court to the terrace, expressed rather than implied, because this era is where
people first stand on a level above the ground. The gate is square-headed under a squared timber
lintel with a corbelled relieving head. **The fourth side is a plain enclosing wall rather than a
range** — that is what "three sides" means, and it is what keeps the court private.

**Materials and ornament.** Mud brick, squared timber roof beams, packed-earth terrace, dry-laid
stone plinth. A corbel course under the roof line on the outward faces. **One strapped gate leaf
and no other bronze**, since the gate is the only part of this building anyone touches.

**Props.** The terrace read as *used* — mats, grain drying, a jar, the stair. A quern in the
court, cloth drying, a swept threshold, a small cooking fire as an emissive surface only. It is
one of the island's residences and must read lived-in.

**Height.** Level with the Merchants' Hall, above the Treasury, below the Council Hall. The gain
over era two's housing goes into the second level and the terrace rather than into a ridge.

**What it must not resemble.** **Era two's Village Houses (civic, livability, 2×2), which is the
sharpest cumulative pair in the civic set** — same plot, and both are flat-roofed mud-brick cells
round a shared court with roof terraces used as living space. `civic-buildings.md` states the axis
itself: **planned against accretive.**

| | The Walled Houses (era 3) | The Village Houses (era 2, standing) |
| --- | --- | --- |
| Plan | Three ranges on **one continuous planned wall line**; the court a true rectangle | Four or five cells of **unequal size** sharing party walls; the court a gap between them |
| Entrance | **A single gated entrance**, one strapped leaf | An **open** shared doorway court. No gate, and no metal anywhere |
| Roof access | **A stair** | **Ladders** |
| Wall | Taller ranges, the outward line unbroken | Lower, and the outline steps in and out with the cells |

It must also not resemble **era one's Hut Cluster (`dwelling`, 2×2)**, which separates on **mass
against repetition**: era one is three or four small domed huts of unequal size sharing one
packed-earth yard, where this is one closed rectangular mass with the yard cut inside it.

**Era three's own Gallery Court is not drawn** — the `dwelling` mass is inert this era — so that
pair never stands. The naming pass records that the two collided by name and fixed it on the
skill side; if the mass is ever given an era-three node, §5's timber gallery reached by a stair
is the feature that separates them.

---

### 9. The Steam House — civic, happiness *(3×2)*

**Plot 3×2 (12×8u), the largest civic footprint yet offered. Cost 400 bronze, 80 happiness.** Six
cells is a lot at this point in the island's growth, and that cost is what makes wanting it a
real choice.

> **Read this before drawing: two words in the catalogue have to be read through §2 and §3, and
> this brief resolves them.** `civic-buildings.md` calls the hall **vaulted** and the porch
> **colonnaded**. Era three has **no lime mortar and no true arch**, and the repeated bay in stone
> is era four's signature move, so: **the vault is corbelled** — courses stepped progressively
> inward, and the steps read as steps — and **the colonnade is a row of squared timber posts** on
> dry-laid stone pads carrying a strapped beam, never a stone order. §2's own note on the word
> *dressed* settles the stone the same way: squared and **laid dry**, with era four keeping the
> real ashlar upgrade.

**Silhouette.** A long roofed hall of thick mud brick whose head closes in **stepped corbelled
courses**, with a lower rectangular hot-room block at one end, a **smoking furnace end** beyond
it, and a timber-posted drying porch running the whole long side. Steam standing over the hall
and one plume at the furnace: **heat is what this building sells and it has to read from
outside.**

**How it stands up.** Mud-brick walls at their greatest thickness carry a corbelled vault over
the hall — masonry stepping inward, never a curve cut into a face and **never a keystone.** The
plunge basin is sunk and lined with roughly squared stone laid dry. The hot room is a **low
rectangular block** with its own corbelled head over a hypocaust of squared stone piers, and **it
is never a dome.** The porch is squared timber posts on dry-laid pads under a split-shingle
canopy, strapped at every lap. The furnace is a built brick mass with a flue at the far end.

**Materials and ornament.** Mud brick; roughly squared dry-laid stone at the basin lining, the
plinth and the hypocaust piers; squared timber and split shingle. Bronze on the entrance door and
the furnace door — `civic-buildings.md` calls these *the first visible cast-metal fittings*, which
is true of the civic catalogue rather than of the era, since every skill building above carries
bronze too. A corbel course under the eaves, and an impressed rope moulding or chevron under the
eaves line, which this building may have and the rest of the civic set may not. **No statuary, no
niche, no carving, no figure work** — §4 forbids all of it.

**Emitted light.** The furnace door as an emissive surface inside the model, lighting nothing.
Steam and smoke are geometry and tone, never light.

**Props.** Bundled fuel at the furnace end, a stack of squared blocks, jars and a bench along the
porch, a drying cloth on the porch rail, ground worn dark and wet at the entrance.

**Height.** Second of the ten and the tallest roofed volume era three draws, below the Stronghold
and above the Council Hall.

**What it must not resemble.** **Era four's Baths (civic, happiness, 3×2), which era four's own
merged brief calls "the sharpest cumulative collision in the civic set, and the closest match in
the whole scan."** *The Bathhouse* became *The Steam House* in the 2026-07-29 pass so the run's
three bathing buildings shared no word, but the **forms** were left alone by both source guides:
**vault, hot room, colonnade and furnace end appear in both**, on the same 3×2 plot. Era four's
brief commits to three separators in the order they survive zoom-out — **the dome first**, then
pale ashlar against era three's mass (era four's brief writes that mass as *"ochre mud brick"*,
which was true when it was written and is now the patina), then where the colonnade sits — and era
three has to hold its end of each:

| | The Steam House (era 3) | The Baths (era 4) |
| --- | --- | --- |
| **1. Dome** | **None, anywhere.** The hot room is a low rectangular block with a corbelled head. The vault is the building's only roof form | **A low dome beside the vault**, which era four calls its silhouette |
| Vault | **Corbelled** — courses stepped inward, steps reading as steps, no keystone | A **true vault** in mortared ashlar |
| **2. Hue and grain** | **Patina-green mud-brick mass** (`#5F6D4E`, L\* 44.1); stone squared and laid **dry**, joints visibly uneven | **Pale flat-faced ashlar** with fine level joints. Era four is the first pale era |
| **3. Colonnade** | **A drying porch along one long side**, and squared timber posts on dry-laid pads under a strapped beam rather than a stone order | **A full peristyle court across the front**, open ground you cross |
| Ornament | The corbel course and one impressed band. **No statuary anywhere** | **Statuary in niches** |

*(Era four's brief pre-empts the material trap here from its own side: era three's catalogue lists
"undressed and dressed stone", and era four's brief rules that era three's §2 and its note on the
word* dressed *win, so era three is squared and dry-laid with visibly uneven joints. Brief #9
reaches the same reading independently. The timber reading of era three's colonnade is this
brief's own derivation from §3 and is additional to era four's positional separator, not a
substitute for it.)*

*(**Row 2 got stronger on 2026-07-31 rather than weaker.** Era four picked it as "pale against
ochre", a contrast of two warm bodies at different lightnesses. Era three is now the **darkest**
body in the first six eras against era four's **first pale** one, so the axis is a straight value
gap — which is the kind that holds on every face a wall turns.)*

It must also not resemble **the Council Hall (#6)**, the era's sharpest internal pair, since both
stand on the wide 3×2 plot and both are read by a fire and a plume. They separate on **plan and
props**: the Council Hall is an **open walled court** whose hearth stands in air with a canopy
over only part of it, where this is a **roofed hall**, closed, with steam standing under its
vault. And the substance differs — **slag and metal against water and steam**: the court has a
spoil of slag and a lean-to of ingots, this has a plunge basin and wet ground.

Nor **era two's Bread Oven (civic, happiness, 2×2)**, each era's happiness purchase and each read
by fire. They separate on **enclosure**: era two's is a raised clay dome standing in the open on a
swept yard with nothing over it, where this is a walled roofed hall whose fire is at one end and
inside.

---

### 10. The Trading Post — civic, blend *(1×1)*

**Plot 1×1 (4×4u), the smallest plot in the era. Cost 480 bronze, 40 livability + 40 happiness.**
Dearest per unit, and the premium buys a plot: both dials on a single tile.

**Silhouette.** A small square mud-brick box on a dry-laid stone base with **a timber canopy
projecting well past its wall on one side** and **a great balance beam hanging under the
canopy.** The canopy and the beam *are* the silhouette — at this size the box alone would read as
a store hut.

**How it stands up.** A dry-laid roughly squared stone base carries a battered mud-brick box.
Squared timber brackets and posts carry the projecting canopy, capped and strapped at every lap.
The beam hangs from a squared timber frame under the canopy, its trunnion strapped and pinned in
bronze. One square-headed door under a timber lintel.

**Materials and ornament.** Dry-laid undressed stone base, mud brick, split-shingle canopy on
squared timber, and **the era's metal in the hand**: the beam and its pans in bronze, the graded
weights with their values punched into the top face on shelves inside, and a cast plate with a
punched mark riveted to the door post. A corbel course under the eaves, small because the wall
is small.

**Props.** Bales and jars stacked under the canopy waiting to be checked. Tally boards on the
wall inside. A two-wheeled cart drawn up at the canopy's edge with ruts in the metalled ground.

**The balance, and a caution the files put on the yard rather than here.** §5 places the era's
strongest D-ERA8 warning on the two `yard` instances: a balance beam is very nearly a picture of
an equation, so it must never read as two sides of one, never carry matched loads for the sake of
symmetry, and never be balanced level as a symbol. D-ERA8 governs *skill* buildings and this one
is civic, so no equivalent caution is authored on it — but **this is the building that now
carries the era's great beam**, so it takes the same treatment: an off-centre load, unequal
contents in the pans, the beam tipped, never a matched pair. *(Recorded as* Findings *8.)*

**Height.** Small, and the canopy is what lifts it: above the Bronze Foundry and below the
Treasury. Nothing about it competes with the full-plot buildings.

**What it must not resemble.** **The Ingot Yard (#4), the era's other balance** — see #4's last
paragraph. In one line: this is a **shut building on one tile with a great roofed beam**, and
that is **2×2 of open ground with a hand balance among objects at waist height.**

It must also not resemble **era two's Village Well (civic, blend, 1×1)**, the same plot and the
same read at zoom-out — a timber frame standing over something. They separate on **mass**: era
three's frame projects from a **walled box that fills the tile**, where era two's stands over **a
hole in the ground**, a low ring parapet with a windlass frame and no walls at all. And era two's
frame turns a **wooden** axle in a wooden bearing because era two may carry no metal, where this
one hangs a bronze beam — which dates the pair on sight.

Nor **era one's Spring (civic, blend, 1×1)**, also the blend on a single tile under a light
frame: era one's is a hide awning on three poles over a rock hollow, with **no building at all.**

---

## The cumulative confusion set

**Step 5 of the skill scopes "what it must not resemble" to the era's own siblings, and for this
era that is too narrow.** Under the 2026-07-29 no-re-dressing ruling a skill building is drawn
once, keeps its look permanently and is never demolished, so **an era-three city has eras one and
two standing on it** — sixteen buildings, only five of them new — and era four and era five will
later stand on top of it. So every pair below was checked in both directions, and the clean
results are reported as well as the collisions.

**Era two is fixed and era three designs around it, not the reverse.** Its brief is written and
merged at `output/imagegen/era-02-neolithic-building-briefs/README.md`, its names are final and
its art is generated, so where era three and era two collide **era three moves.**

**A note that saves a search.** Era three's §5 refers to era two's buildings by era two's own §5
shape-chain prose, not by its ratified subtitles. Both are current; they are two vocabularies for
the same seven masses. The mapping:

| Era three's §5 says | The building that stands is |
| --- | --- |
| era two's granary rotunda | **the Meeting House** (RAD.3) |
| era two's raised store | **the Seed House** (EXP.1) |
| era two's cells | **the Family Compound** — inert, never drawn |
| era two's firing yard | **the Potter's Kiln** (RAD.1) |
| era two's granary tower | **the Stone Tower** (RAD.4) |
| era two's bake house | **the Shrine** (the hub) |

### The six named cross-era pairs, checked at this tip

> **Re-checked after a merge landed mid-run, and the re-check changed things.** This brief was
> started against a tip at which no later era had a written brief — era four's said *"era three's
> brief does not exist yet"* and era five's said *"era three's is in flight"*, and both read era
> three from its source documents instead. **Six briefs then merged: eras four, five, six, seven,
> eight and nine.** Every pair below was verified again against those, and **all six named pairs
> are confirmed from the other side, in the later briefs' own words.** One thing they corrected
> rather than confirmed: **era one's and era two's hubs are not standing**, so brief #6 was rewritten
> from a separation table into a lineage table.

**1. the Treasury (LIN.4) against era four's Wine Cellars (POL.4) — CONFIRMED on every count,
including the plot.** Era four's subtitle row reads *the Wine Cellars*; its roster reads *"A
bonded warehouse, barrel-vaulted bays opening onto a loading platform"*; and its closure block
reads **"POL.4 (store) takes the long plot"**, which is the plot era three's closure block gives
LIN.4. So: same mass, same long plot, adjacent eras, both bonded and shut. **Era three's side is
held in brief #3** — one square-headed opening under a squared timber lintel with a corbelled
relieving head whose steps read as steps, in mud brick on a dry-laid plinth, and **no loading
platform**, its threshold meeting metalled ground flush. Lintel against arch holds because era
three's §2 forbids the true arch outright and §3 says there is no keystone anywhere in the era.

**2. The Steam House against era four's Baths — CONFIRMED, and the form collision is still
open.** Both are 3×2. **Vault, hot room, colonnade and furnace end appear in both**, verbatim
from each catalogue. The **name** collision was fixed on 2026-07-29 and both files record it at
length; **searching era four's two files for every reference to era three returns seven, and not
one of them is about this building's form.** So the collision is unaddressed at the tip rather
than addressed elsewhere. Era four's separator is the dome, which era three cannot have because
it has no mortar. **Era three's side is stated as a four-row table in brief #9**, and it follows
from era three's own §2 and §3 rather than from anything either file says about the pair.

**3. the Bronze Foundry (LIN.3) against era four's Stonecutters' Shop (POL.1) — CONFIRMED, and
fire separates them cleanly.** Era four's roster reads *"A mason's workshop, open colonnaded
front, blocks on trestles, chisels racked behind"* — **no fire of any kind**. Era three's reads
two smelting hearths with their bellows, a charcoal store and a slag spoil. A second axis holds
underneath it: era three's open front is squared timber posts under a strapped beam where era
four's is a stone colonnade, which era three may not have because the repeated bay in stone is era
four's signature move. **Note the plots differ too** — era four's closure block puts POL.1 on the
square full plot, the same as LIN.3, so plot does *not* separate this pair and the two axes above
carry it alone.

**4. the Ingot Yard (LIN.5) against era four's Barracks (POL.2) — CONFIRMED, and the shear-legs
caution is correct.** Era four's roster reads *"a stone yard: sawn blocks stacked in courses, **a
timber shear-legs hoist**, chippings underfoot"*, so era four does carry the device, and era
three's props kit and `construction` stage both claim it as era three's own dating machine. **The
resolution era four took — letting pale sawn stone carry the separation — works, and era three
must not spend it back.** Era three's side: **this yard carries no hoist at all**, which §5
independently requires by allowing nothing above waist height, and which the constraint list
requires because shear-legs on a finished era-three plot read as a building still going up. **A
detail the pairing did not mention and which helps:** era four's closure block puts POL.2 on the
**long plot** where era three's puts LIN.5 on the **square full plot**, so the plots differ as
well.

**5. the Stronghold (LIN.6) against era five's Tower House (RAT.4) — CONFIRMED, and a third axis
is available.** Era five's roster reads *"a square block of coursed rubble, an **external
forestair** to a first-floor door, a battlemented parapet on corbels"*; era three's reads *"a
corbelled solid parapet at its head, **reached only from inside**"*. Both are stout masonry blocks
with a corbelled parapet, and **plan cannot separate them because both are blunt squares** — so
the forestair is doing the work, and era three must keep every outward face empty for it to keep
working. **The third axis, from the same two lines:** era three's parapet is **solid** where era
five's is **battlemented**, and nothing in era three's §4 permits cutting a wall into teeth.
Grain gives a fourth: a mud-brick shaft on a dry-laid undressed footing against coursed rubble
throughout.

**6. The trade hall as a third long ridged hall — CONFIRMED as a form collision, but the "all
see-through" part of it is wrong on era one.** Era two's Meeting House is *"open at both gable
ends so you can see straight through the building along its axis"* — see-through, and it is the
sharp pair, handled with a four-row table in brief #1. **Era one's Family Lodge is not
see-through.** `era-01-prehistoric/civic-buildings.md` authors it as *"One long thatched roof with
a shallow ridge running the long axis, carried on battered earth walls, low eaves nearly touching
the ground, **a single doorway** with a notched post beside it"*. So it is a third long ridged
hall, and the collision with it is real, but it separates on **aperture** — one doorway and low
eaves against two cart-height openings — rather than needing the through-view axis at all. **The
through-view is shared with era two alone.**

### What the later merged briefs already say about era three's ten

**Read from the merged briefs at this tip, not inferred.** Era three is drawn once and stands for
the rest of the run, so these are the separations later eras have already committed to against it.
**Era three does not owe them anything further** — each later era took its own side — but a
building drawn against this brief has to keep the property the later brief is separating from, so
they are recorded here rather than left in six other files. **Four rivals appear here that the
six named pairs did not cover**, and they are marked.

| Era three building | Later rival, and where it is stated | The axis the later brief committed to |
| --- | --- | --- |
| the Merchants' Hall | **Era four's Custom's House** — *new* | **Apse and clerestory.** Era four records a collision of "two axial halls with an internal row of posts on one plot" and separates on its own added apse and clerestory, so era three's must stay one unstepped volume with a flat ridge and no apse |
| the Merchants' Hall | Era five's Guild Hall | Era clothes plus the arcade; era five notes both let daylight through |
| the Bronze Foundry | Era four's Stonecutters' Shop | **Fire and material.** "This building has no fire anywhere on it", against two hearths, bellows and slag; and a counted row of stone columns against era three's timber posts |
| the Bronze Foundry | Era five's Weaver's Shop, era seven's locomotive shop | **Fire again**, plus era clothes and scale |
| the Treasury | Era four's Wine Cellars | **Arch against lintel.** "One door against many arches, ochre against pale, and the platform as a third tell" |
| the Treasury | **Era four's Grain Dock** — *new* | **Plot shape does most of it** — square against long — plus pale ordered ashlar against blank ochre mud brick |
| the Treasury | **Era five's Wool Store** — *new* | Era three's height is **in its wall**, era five's is **in its roof**; and era three's bronze door fittings are the first metal on the island, which era five does not use |
| the Treasury | Era seven's warehouse | Era three is "a windowless mass with one bronze-fitted door" |
| the Ingot Yard | Era four's Barracks | **Verticality and plot.** Nothing above waist height on a square plot, against a long run with a hoist. Era four takes the caution and lets pale sawn stone carry it, with its hoist in plain timber and no bronze strapping |
| the Ingot Yard | **Era five's Fairground** — *new* | **Trestles on open ground in both**, so props carry it: a balance and weights against booths, awnings and a stepped stone cross |
| the Stronghold | Era five's Tower House | **Reached only from inside against an external forestair**, and a solid parapet against crenellations |
| the Stronghold | Era seven's Water Tower | Material and head: undressed stone footings and rough coursing against machine-made brick in thin even courses |
| The Walled Houses | Era five's Castle | Era three has **flat roofs used as living space and no tall element at all** |
| The Steam House | Era four's Baths | **The dome first**, then pale ashlar against ochre mud brick, then where the colonnade sits |
| The Steam House | Era five's hub, era seven's **The Food Works** *(the files read* The Wash House *until the consolidated pass)* | **Where the smoke comes out** — era three's from a furnace end at one gable |
| the Council Hall | — | **Clear by mechanism in every later era.** The hub rethemes, so era three's landmark never stands beside a later one |
| The Terraced Fields · The Trading Post | Era four's Grain Dock, Fountain | **Clear** in era four's own scan, on form |

**The word *ochre* in three rows above is the later brief's own, quoted, and it names a body era
three no longer wears.** Era three's side of each is now a patina-green mass at L\* 44.1 — pale
ashlar against **the darkest body in the first six eras** rather than against a second warm
mid-tone — so all three axes hold at least as well as they did and two of them hold better.
**Correcting era four's brief is era four's to do and not this document's**; the era-three guide's
palette amendment records what is owed and to whom.

**One disagreement observed while verifying, outside era three and reported rather than fixed.**
Era four's merged brief writes its `hall` dressing as **"the Custom's House"** in all fifteen
occurrences, where era four's `style-guide.md` subtitle row, `eras/README.md`'s cross-era table
and era five's merged brief all read **"the Custom House"**. Era three's brief uses the form the
guide and the cross-era table give.

### Era one, scanned for exact form collisions

All eleven of era one's standing buildings — six skill, the hub, four civic — were read against
era three's ten. **Two collisions were found that the named list above does not cover, and the
rest are clean.**

- **FOUND: era one's Hide Shed (`store`, 2×1) against the Treasury (2×1).** The same long plot,
  and both are a long low shed with its ridge running the long axis on a stone footing — the
  closest era-one form match to anything in era three. **They separate on aperture**, and it is
  the same axis that separates era two's store: era one's **gable end is open** with racks and
  rolled hides visible right through it, where the Treasury has one door and nothing else along
  its length. Grain gives a second: thatch and undressed footing against a timber ridge and a
  dry-laid squared plinth. Carried into brief #3's neighbourhood by the same "no open bay of any
  kind" rule already stated there.
- **FOUND: era one's Tool Shelter (`workshop`, 1×1) against The Trading Post (1×1).** Era one's
  is *the only* building on a single tile in its era, and the Post is the only one in this era,
  so they occupy the same slot on the island. Both read as a frame with a light roof over a small
  working spot. **They separate on mass**: the Post is **a walled box filling its tile** with a
  canopy projecting past the wall, where the Tool Shelter has **no wall at all** — a post-and-
  lintel frame, a thatch lean-to on one side, an open floor and the era's most notched tally post
  at its edge.
- **CLEAN: era one's Lookout (`tower`, 2×2) against the Stronghold.** An open lashed timber frame
  you see through, against a solid corbelled block. This is the strongest contrast on the tower
  mass anywhere in the run and needs nothing added.
- **CLEAN: the Roundhouse (`hall`, 2×2) against the Merchants' Hall.** A closed conical thatch
  roof on a ring of battered earth, against a rectangle under a low timber ridge open at both
  ends. Cone against ridge, and plan against plan.
- **CLEAN: the Clearing (`yard`, 1×2) against the Terraced Fields (1×2) and the Ingot Yard
  (2×2).** Era one's is swept earth with a hearth ring, boulders, a drying rack and one tree;
  neither era-three plot has any of those, and both are visibly *worked* where era one's is
  visibly *left*.
- **CLEAN: the Hut Cluster (`dwelling`, 2×2) against The Walled Houses.** Handled in brief #8 —
  unequal domed huts round an open yard against one closed rectangular mass with the yard inside
  it.
- **CLEAR BY MECHANISM: the Stone Circle (hub, 3×2) against the Council Hall.** The hub rethemes,
  so era one's landmark **is not standing** when era three is current — there is one town hall and
  it wears era three's clothes. Brief #6 keeps the comparison as **lineage** rather than as a
  confusion, which is the only thing it can honestly be.
- **CLEAN: the Smokehouse (civic, 2×1) against the Treasury and the Bronze Foundry.** Lashed
  timber A-frames over an open fire trench, hung with meat, with a hide windbreak and no wall
  anywhere. Neither an era-three box nor an era-three three-walled shed can be mistaken for it.
- **CLEAN: the Campfire (civic, 2×2) against the Council Hall.** Both a fire inside a boundary,
  but era one's ring is at ground level with nothing over it at all, where era three's is a
  walled court with a canopy over part of it. This is the Stone Circle axis again and it holds
  the same way.
- **CLEAN: the Family Lodge (civic, 2×2) against the Merchants' Hall** — see pair 6 above; and
  **the Spring (civic, 1×1) against The Trading Post** — handled in brief #10.

### Era two, all ten checked

| Era two building | Era three counterpart | Result |
| --- | --- | --- |
| the Seed House (EXP.1, `store`, 2×1) | the Treasury (2×1) | **Axis needed and given** — lift: a box in the air on stumps against a box on the ground |
| the Potter's Kiln (RAD.1, `workshop`, 2×2) | the Bronze Foundry (2×2) | **Axis needed and given** — plan and props: a sunken pit under an open shelter against two built hearths in a three-walled shed |
| the Sheep Pen (RAD.2, `yard`, 2×2) | the Ingot Yard (2×2) | **Axis needed and given** — boundary: a fence that *is* the building against a kerb line in the ground |
| the Meeting House (RAD.3, `hall`, 2×2) | the Merchants' Hall (2×2) | **Axis needed and given** — props and grain, four rows: leaves, roof, cart, wall |
| the Stone Tower (RAD.4, `tower`, 2×2) | the Stronghold (2×2) | **Axis needed and given** — plan and props: a circular drum with an earth ramp against a square block that widens at the top |
| the Shrine (hub, 3×2) | the Council Hall (3×2) | **CLEAR by mechanism** — the hub rethemes, so era two's landmark is not standing. Kept in brief #6 as lineage |
| The Granary (civic, 2×1) | the Treasury (2×1) | **Axis needed and given** — the Seed House axis again, plus aperture: the Granary reads open and full |
| The Village Houses (civic, 2×2) | The Walled Houses (2×2) | **Axis needed and given** — planned against accretive, four rows |
| The Bread Oven (civic, 2×2) | The Steam House, the Council Hall | **Axis needed and given** — enclosure: a dome in the open against a roofed hall and against a walled court |
| The Village Well (civic, 1×1) | The Trading Post (1×1) | **Axis needed and given** — mass: a frame over a hole against a frame off a walled box |

**Nine of ten needed an axis and have one; the tenth is clear by mechanism.** That is the
cumulative cost of the no-re-dress ruling stated plainly: era two shares a plot with an era-three
building on nine of its ten, because the plots are frozen and both eras draw from the same seven
masses. Only the hub escapes, and only because it is the one building that rethemes.

### What is actually standing when era three is current

Derived from the three roster tables and `ERA_SEQUENCE` rather than from any summary, because the
scope of everything above depends on it.

| Mass | Standing at era three, oldest first | Count |
| --- | --- | --- |
| `hall` | Roundhouse (1) · Meeting House (2) · **Merchants' Hall (3)** | 3 |
| `store` | Hide Shed (1) · Seed House (2) · **Treasury (3)** | 3 |
| `dwelling` | Hut Cluster (1) | **1** — no era-two or era-three node lands on `dwelling` |
| `workshop` | Tool Shelter (1) · Potter's Kiln (2) · **Bronze Foundry (3)** | 3 |
| `yard` | Clearing (1) · Sheep Pen (2) · **Ingot Yard (3)** | 3 |
| `tower` | Lookout (1) · Stone Tower (2) · **Stronghold (3)** | 3 |
| `town-hall` | **the Council Hall (3) only** | **1** |

**Sixteen skill buildings plus one hub**, and the sixteen is the figure the guide's own header
gives — 6 + 5 + 5 — which is how this table was checked rather than asserted. **Plus up to twelve
civic buildings**, four per era across three eras, every one of them frozen in the era it was
built (D-ERA11) and removable only by teardown. So the era-two and era-one civics in every
comparison above are genuinely on the ground; only the earlier hubs are not.

## Findings

**Reported, not fixed**, per the brief this document was written to. Each names the file and
quotes the text it turns on.

**1. §3's height ranking covers only buildings this era will never draw.** Its order —
*"the gate tower... then the assembly rotunda; then the furnace court... then the bonded store and
the courtyard house... then the casting workshop; and the weighing yard lowest"* — is §5's chain
dressing headings verbatim, and **six of those seven are REFERENCE ONLY** under the head banner
and §5's own banner. Only the landmark is a deliverable. **None of the five buildings era three
owes appears in the guide's ranking.** This brief derives one from §5's stated scale-and-props
separations and labels it as derived.

**2. A live sentence in §5 inverts the ruling stated four paragraphs above it.** The hall
paragraph ends: *"the **round** version is the one carrying the chain, and if only one hall gets
modelled for this era it is the rotunda."* §5's banner says the chain instances *"will not be
built"*, so the only era-three hall that gets modelled is LIN.1's trade hall and the sentence
gives the opposite priority. The same paragraph calls the rotunda *"still the tallest roofed
building in the town"*, which ranks an unbuilt instance. **This is precisely the banner trap the
skill warns about**: the sentence reads exactly like live guidance.

**3. The roster's footprint paragraph contradicts the closure block.** Roster: *"**Footprints are
not yet authored for these five** — every node outside D1 resolves to `DEFAULT_FOOTPRINT`,
2×2."* Closure block: *"**Footprints for the five new nodes are decided.**"* The head banner
resolves it — *"the footprints for the five new nodes... are all closed at the end"* — so the
roster paragraph is stale, but it is the one an artist reading the roster meets first.

**4. §5's store chain paragraph still opens with its sibling's description.** Its lead sentence —
*"Thick mud-brick walls, one lockable door with cast bronze fittings, and goods stacked in bays
behind a low counter"* — is all but word for word the roster's LIN.4 line, and §5's own correction
block below it then assigns that description to LIN.4 and gives the chain the open bay. **The
correction was made by adding a paragraph rather than by editing the paragraph it corrects**, so
the chain dressing's first reading is still the sealed building. **The subtitle half of this defect
did land and is verified**: the naming block justifies *the Treasury* against LIN.4's sealed store,
and `eras/README.md`'s cross-era table agrees with era three's subtitle row on all seven masses.

**5. The decided footprints are not in code, and one of them disagrees.** `NODE_FOOTPRINTS`
(`apps/web/src/city/worldLayout.ts`) carries only `NUM.S`, `NUM.F`, `NUM.2`, `NUM.3`, `NUM.4`,
`NUM.5` and `town-hall`, and `footprintFor` falls through to `DEFAULT_FOOTPRINT` 2×2 for
everything else. So **LIN.4's decided long plot is 2×2 in code today**; the other four agree with
the default only by coincidence. INV-ERA-1 freezes whatever is eventually wired, so the
disagreement is worth closing before anything is modelled. **This brief follows the closure
block**, since that is the ratified decision.

**6. §5's footprint sentence reads as the era's and is era one's.** §5 says *"the yard is the
two-cell strip on the short axis; the workshop has a single tile"* while the closure block puts
LIN.5 (yard) and LIN.3 (workshop) on the square full plot. Read carefully both are true — §5 names
the plots era one froze for the inherited instances, the closure block sets the new nodes' — but
§5's sentence does not say it applies only to the chain instances. **Era two hit the identical
hazard and its brief closed it as flag 2**, so this is a known shape of defect in this folder.

**7. `civic-buildings.md` gives world-unit heights and the style guide forbids them.** §3:
*"Heights are stated as an order, and this guide deliberately gives no world-unit targets."* The
catalogue gives ~8, ~9, ~6 and *"nothing above ~2 units"*. **Used in this brief as relative order
only.** Era two's brief left the same contradiction open between the same two files, so it is a
folder-level pattern rather than an era-three slip.

**8. The era's strongest D-ERA8 caution is on the yard, and the great beam is on the civic Post.**
§5 puts *"never read as two sides of an equation, never carry matched loads for the sake of
symmetry, and never be balanced level as a symbol"* on both `yard` instances. `civic-buildings.md`
gives The Trading Post *"a great balance beam"* with no equivalent caution, and the naming pass
explicitly kept *"the scales... in the art"* when it renamed The Weigh House. **D-ERA8 governs
skill buildings, so this is a gap rather than a contradiction** — but the era ships two
balance-carrying buildings and only one is warned. This brief applies the caution to both.

**9. The Steam House / Baths form collision is open in the SOURCE GUIDES and now closed in era
four's brief.** ⚠ **This finding was written, then superseded by a merge mid-run, and both halves
are kept because the first half is still true of the documents an author edits.** As written: era
three's and era four's *style guides and civic catalogues* record the **name** fix in detail and
never separate the **forms**, and era four's two source files reference era three seven times
without once touching it. **What changed:** era four's brief merged during this run and **does**
address it, committing to three separators — dome, pale ashlar against ochre mud brick, and where
the colonnade sits — and pre-empting the *dressed stone* trap from its own side. Brief #9 now
states era three's end of all three. **The residue that is still a finding:** the separation lives
only in the two *briefs*, not in either era's source guide, so an author editing
`era-03-bronze-age/civic-buildings.md` or `era-04-classical/civic-buildings.md` will see no sign
that the two buildings share four features and a plot. *(**"Ochre mud brick" is era four's wording
and it is quoted here as era four wrote it.** Era three's body moved to the patina on 2026-07-31,
so that half of era four's second separator is stale on era three's side and is owed to era four;
brief #9's own table states the current value. See the banner at the head of the theme brief.)*

**10. The `ingots` banner undercounts its own file.** It says *"**THE INGOTS IN THIS FILE KEEP THE
WORD, deliberately — all seven of them**"* and then enumerates six places. Measured at this tip:
the string *ingot* occurs **19** times in `style-guide.md`, **9** of them inside the banner block
itself, leaving **10** occurrences in **9** distinct places outside it — the roster's LIN.5 line,
§5's store chain, §5's yard, the island section, the props kit, the subtitle row, the naming-pass
bullet, the lesson context palette, and LIN.1's framing row. Nothing is wrong about *which*
occurrences are physical objects; only the tally is, and since the banner exists to stop a
find-and-replace, a count short of the file weakens the guard.

**11. "Vaulted" and "colonnaded" in the Steam House are era four's vocabulary, unqualified.**
Not strictly a contradiction — §2's own note on the word *dressed* shows this file expects a
reader to resolve such words against the material list — but the catalogue leaves both open, and
the natural reading of either would spend era four's signature four years early. **Resolved in
brief #9** as a corbelled vault and a timber-posted porch, and recorded here so the resolution is
visible rather than silent.

### Clean results, stated so the absence of a finding is not read as an omission

- **Node ids: clean.** `ERA_SEQUENCE`'s `bronze_age` entry is `["LIN.1", "LIN.3", "LIN.4",
  "LIN.5", "LIN.6"]`. The roster pairs those five with `hall`, `workshop`, `store`, `yard`,
  `tower`; the closure block pairs them identically. **No id is crossed against a mass anywhere
  in this era**, in either place — which is worth measuring rather than assuming, since era two
  had three of five crossed in the equivalent block, era five has a store whose cart doors one
  section bars and another opens, and era six has a separating axis written against the wrong
  building.
- **Names: no renames pending.** All seven skill and hub names come from the ratified subtitle
  row and all four civic names from the catalogue. `eras/README.md`'s cross-era table agrees with
  era three's subtitle row on every one of the seven masses.
- **The Stronghold needed no change**, as the lead confirmed: it is *kept* in the naming pass, on
  the stated grounds that a stronghold names a thing only its own era has.
- **The material id is `bronze`**, renamed from `ingots` and landed in `#233`. Ingots on a balance
  are a prop, not the material id, and the guide's banner authors that distinction deliberately.
- **Era three's roster came through PR #180's curation unmoved**, exactly as the strict
  one-domain mapping had it, so nothing in the roster is a curation artefact.

---

## Compressed, for prompting

**Paste-ready.** Prepend *The theme brief*, *How the era spends its metal* and *Constraints that
bind every image below*, then one entry from here, and the pair stands alone — nothing below
depends on the long brief above it. Each entry keeps the silhouette, the load path in brief, the
materials that differ from the era's default four, the one detail that has to read, and the
single confusion to avoid. Height rankings and props are dropped except where a prop is what
makes the building recognisable.

**the Merchants' Hall — skill, LIN.1, `hall`, 2×2.**
One long low timber ridge over a plain battered mud-brick box, with a wide square-headed opening
at each end and both bronze-sheathed door leaves swung back flat against the wall, so you see
straight through the building from end to end. Load-bearing mud-brick walls carry the ridge at
the sides while a central row of squared timber posts, capped and strapped in bronze at every
lap, carries it down the middle, and a squared timber lintel spans each opening under a corbelled
relieving head. Off the era's default it takes a low timber ridge rather than a reed cone, and a
dry-laid squared-stone plinth. **The detail that has to read is the two open leaves** — sheathed,
studded, hinges left large enough to see — with a loaded two-wheeled cart standing in one
doorway, which no earlier era on this island could have. Do not let it resemble era two's Meeting
House, the standing hall on the same plot: era two's gable ends carry no leaf at all and its roof
is combed thatch.

**the Bronze Foundry — skill, LIN.3, `workshop`, 2×2.**
A deep open-fronted shed of thick mud brick under a low shingled timber canopy, with two hearth
mouths side by side against the back wall, two plumes leaving the roof, and a spoil of slag
running downhill off the plot behind it. Three thick mud-brick walls carry the canopy at the back
and sides, and the open front is a row of squared timber posts on dry-laid stone pads under a
strapped beam — post and lintel, never a colonnade. Off the era's default it takes a
split-shingle canopy and brick left smoke-stained above the hearths, and it carries its bronze as
product rather than as fitting: ingots, sprues, offcuts, a crucible in tongs. **The detail that
has to read is the two hearth mouths**, as emissive surfaces bright in themselves and lighting
nothing around them. Do not let it resemble era two's Potter's Kiln, the standing workshop on the
same plot, whose fire is a pit sunk into the ground under a shelter that is mostly roof and air.

**the Treasury — skill, LIN.4, `store`, 2×1.**
A long low blank box of very thick mud brick under one low ridge running the full length,
carrying one door and no other opening of any kind anywhere along it. Load-bearing mud brick at
its greatest thickness in the era, battered hard at the base on a dry-laid squared-stone plinth,
the single square-headed opening under a squared timber lintel with a corbelled relieving head of
stepped courses above it. Off the era's default it takes a low timber ridge, and it carries the
densest concentration of bronze in the era on that one leaf — sheathing, big studs, visible
hinges, a lock plate — and none anywhere else. **The detail that has to read is the blankness**:
three unbroken brick faces with the batter and a corbel course and nothing besides, which is most
of what the orbiting camera ever sees. Do not let it resemble era four's Wine Cellars, the same
mass on the same long plot: era four's is a row of barrel-vault mouths on a raised loading
platform, so this head must read as lintel and stepped corbel and this threshold must meet the
ground flush.

**the Ingot Yard — skill, LIN.5, `yard`, 2×2.**
Ground, and four objects on it: a kerbed apron of metalled gravel filling the plot, open to the
sky with no roof, no awning and no fence, carrying a low stone weighing table, a hand balance on
a trestle, a banded chest and stacked cast bars, with nothing rising above waist height. Nothing
on the plot is founded — the apron is rammed gravel and chips edged with dry-laid kerbstones at
ground level, the table a roughly squared slab on dry-laid supports, the trestle squared timber
strapped at its lap. It has no wall and therefore no corbel course, and not one strap in its
fabric: all of its metal is loose objects. **The detail that has to read is the tipped beam** — an
off-centre load, unequal contents in the pans, never level and never a matched pair. Do not let
it resemble era four's Barracks, which is heaped with pale sawn ashlar and carries a shear-legs
hoist; this yard carries no hoist at all.

**the Stronghold — skill, LIN.6, `tower`, 2×2.**
A stout square block of battered mud brick on a footing of dry-laid undressed stone, wider at its
head than at its base because the parapet corbels out on stepped courses, with nothing on the
outside to climb and no opening above the footing on any outward face. The footing carries a
solid shaft, the parapet is carried past it on courses stepped progressively outward, and the
tower stands at an angle of the terrace revetment so the dry-laid revetment runs into its footing
on two sides. Its only metal is one barred and strapped timber door on the inner face, the only
side anyone reaches it from, and the parapet is solid — no crenellation, no merlon, no embrasure.
**The detail that has to read is the corbelled head**, whose steps must read as steps. Do not let
it resemble era five's Tower House, the other square block with a corbelled parapet: era five's
read is an external forestair and a battlemented parapet, so every outward face here stays empty
and this parapet stays solid.

**the Council Hall — hub, `town-hall`, 3×2.**
A rectangular walled court of battered mud brick with a shingled timber canopy on heavy posts
over part of it, a smelting hearth standing in the open air inside, and a barred bronze-strapped
double gate in the wall — so it reads as an enclosure you cannot see into except through the
gate, with one plume rising out of it. A continuous wall encloses the court on all four sides and
is headed with a corbel course, while heavy squared timber posts inside carry the canopy, capped
and strapped at every lap. Off the era's default it takes a split-shingle canopy, brick left
smoke-stained above the hearth, and a barred double leaf shown with one side open so the fittings
read from both faces. **The detail that has to read is the wall itself** — the fire era one
gathered round and era two shut inside an oven is now valuable enough to be kept behind one. Do
not let it resemble era two's Shrine, the standing hub on the same plot, which has no walls at
all and a domed clay oven rather than a smelting hearth.

**The Terraced Fields — civic, food, 1×2.**
Two stepped shelves of packed earth held by low dry-laid undressed stone retaining walls, planted
in rows, with a water channel along the upper lip and the timber sluice frames the only thing
standing on the plot. The retaining walls are roughly squared stone laid dry, waist-high at most
and battered slightly back into the earth they hold, with the terraces levelled behind them.
**It carries no bronze anywhere, and that is deliberate** — it is the one building in the era with
no metal at all, so the sluice gates are timber pegged into timber with no strap and no pin. Do
not let it resemble the island's own terracing, which now holds the sloping worked plots behind
low stone revetments: keep the two steps equal and deliberate, the rows straight and planted, and
the retaining wall coursed straight-ish and squared where the island's revetments are rougher and
follow the slope.

**The Walled Houses — civic, livability, 2×2.**
Three ranges of mud brick on a single planned wall line, flat-roofed and used as living space,
closing a court with one gated entrance and no other opening at ground level. Load-bearing
battered mud brick on a dry-laid stone plinth carries flat packed-earth roof terraces on
close-set squared timber beams, with a stair up from the court to the terrace and a plain
enclosing wall rather than a range on the fourth side. Its only bronze is one strapped gate leaf,
since the gate is the only part of this building anyone touches. **The detail that has to read is
the terrace in use** — mats, grain drying, a jar, the stair — because the court's privacy is the
amenity this building sells. Do not let it resemble era two's Village Houses, the standing
dwelling on the same plot: era two's are cells of unequal size round an open doorway court
reached by ladders, where this is one continuous planned wall line with a gate and a stair.

**The Steam House — civic, happiness, 3×2.**
A long roofed hall of thick mud brick whose head closes in stepped corbelled courses, with a
lower rectangular hot-room block at one end, a smoking furnace end beyond it, and a timber-posted
drying porch running the whole long side, steam standing over the hall and one plume at the
furnace. **The catalogue's words *vaulted* and *colonnaded* have to be read through the era's
absences: the vault is corbelled, courses stepped inward with the steps reading as steps and no
keystone anywhere, and the porch is squared timber posts on dry-laid pads under a strapped beam,
never a stone order.** The plunge basin is sunk and lined with roughly squared stone laid dry, the
hot room stands over a hypocaust of squared stone piers and is never a dome, bronze goes on the
entrance door and the furnace door only, and there is no statuary, no niche and no carving
anywhere on it. **The detail that has to read is the heat** — the furnace door as an emissive
surface lighting nothing, the flue, and the steam. Do not let it resemble era four's Baths, which
share this plot and its vault, hot room, colonnade and furnace end: era four separates the two on
the dome, so nothing here may be domed and nothing may be mortared.

**The Trading Post — civic, blend, 1×1.**
A small square mud-brick box on a dry-laid stone base with a timber canopy projecting well past
its wall on one side and a great balance beam hanging under the canopy — the canopy and the beam
are the silhouette, since at this size the box alone would read as a store hut. A dry-laid
roughly squared stone base carries the battered box, squared timber brackets and posts carry the
canopy, and the beam hangs from a squared timber frame with its trunnion strapped and pinned in
bronze. This is the building that carries the era's metal in the hand: the beam and its pans in
bronze, and the graded weights with their values punched into the top face on shelves inside.
**The detail that has to read is the beam carrying a real off-centre load and tipped** — never
level, never a matched pair, never two sides of an equation. Do not let it resemble era two's
Village Well, the other single tile with a frame standing over something: era two's frame stands
over a hole in the ground and turns a wooden axle in a wooden bearing, where this one projects
off a walled box that fills its tile.

## Related

- `era03-bronze-age-concepts.jsonl`, in this folder — **the ten generation prompts that produced
  the ten images beside it**, one per building, each naming both hexes of the patina pair inline
  and each keyed to the `out` filename it wrote. It is the only thing this art can be
  regenerated from, which is why it is committed here rather than left in scratch. Run it with
  `python3 ~/.codex/skills/.system/imagegen/scripts/image_gen.py generate-batch --input
  output/imagegen/era-03-bronze-age-building-briefs/era03-bronze-age-concepts.jsonl --out-dir
  output/imagegen/era-03-bronze-age-building-briefs --concurrency 3`. **Generation costs money and
  the current ten are correct**, so add `--dry-run` unless a regeneration has actually been
  decided.
- `docs/superpowers/specs/eras/era-03-bronze-age/style-guide.md` — the era's materials,
  structural language, ornament, the roster, the masses section, the island, the palette, the
  construction stages, the props kit, the subtitle row, the advisor and the lesson framings.
- `docs/superpowers/specs/eras/era-03-bronze-age/civic-buildings.md` — the four bought types,
  their footprints, costs and capacities, and the `bronze` rename.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` §0 — the nine hard constraints
  every era inherits; §6 for the frozen footprint table and era one's six buildings.
- `docs/superpowers/specs/eras/era-01-prehistoric/civic-buildings.md` §2 — era one's four civics.
- `output/imagegen/era-02-neolithic-building-briefs/README.md` — era two's ten as generated, and
  the authority for what era two put on this island.
- `docs/superpowers/specs/eras/era-04-classical/style-guide.md` and its `civic-buildings.md` —
  the Wine Cellars, the Stonecutters' Shop, the Barracks and the Baths, for the four forward
  pairs above.
- `docs/superpowers/specs/eras/era-05-medieval/style-guide.md` — the Tower House, for the fifth.
- `output/imagegen/era-04-classical-building-briefs/README.md` and
  `output/imagegen/era-05-medieval-building-briefs/README.md` — the merged briefs that state era
  four's and era five's side of every pair above, and the source of the standing-population method
  used here. Eras six to nine were read for era-three references as well.
- `packages/skill-graph/src/eras.ts` — `ERA_SEQUENCE`, which owns the node ids.
- `apps/web/src/city/worldLayout.ts` — `NODE_FOOTPRINTS`, `footprintFor`, `FOOTPRINT_FILL` and
  `MAX_BUILD_HEIGHT`.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produced this document.
