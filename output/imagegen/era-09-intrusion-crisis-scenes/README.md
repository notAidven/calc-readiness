# Era 09 — Intrusion Crisis scene concepts

> Historical concept pack. The approved record-and-clean-copy Cut-or-Restore redesign is
> implemented from `output/claude-design/era-09-intrusion-redesign/`.

Image-generation briefs for the fourteen frames era nine's mid-era crisis owes. Written against
`docs/superpowers/specs/2026-08-01-intrusion-crisis-art-brief.md`, the six plates in
`docs/superpowers/specs/crisis-reference-packs/intrusion/`, and
`docs/superpowers/specs/eras/era-09-information/style-guide.md`.

> ## ⚑ REWRITTEN 2026-08-02 to the object-on-parchment style, at `integration` `0cb08e7e`
>
> **The subject is an object on plain parchment and there is no ground in the picture.** The previous
> version (`#410`, 951 lines) asked for *"a scene standing on the island"* over engineered paving
> running to all four frame edges — the request every measured failure on era one's sheet came back
> from: empty frames, subjects at 1.4 to 9.3 percent of frame jammed against the left edge, a floating
> slab of terrain. **None of those failure modes can occur when there is no ground in shot.** The
> style followed is `output/imagegen/era-02-neolithic-building-briefs/README.md`, whose ten briefs
> produced usable images; the evidence against the old one is
> `output/imagegen/era-01-hard-winter-fire-and-shield/README.md`, retired as a prompt sheet and kept
> as the failure record this rewrite is founded on.
>
> **Kept from `#410` and not re-argued:** the fourteen frames and the one-state-per-image production
> decision, the compositing table, the propagation and no-edge-layer sections, the barrier-tone ruling
> and its measurements, the ruling that a prohibition survives only if it encodes a decision, and every
> subject, silhouette and confusion it identified.
>
> **Era nine gains most from the parchment and it is the sheet with the most to lose.** Two of its
> subjects are a small matrix panel beside a door and a raised collar on a duct marker in the paving,
> which are precisely the geometries that produced era one's five-percent-of-frame hearths; given a
> frame each on a plain ground they are legible and the countability claims become checkable. **And
> its one absolute prohibition — no edge layer — is about what may appear in a piece of paving**, so
> the ground section below is where that ruling is enforced as well as the slab.

> ## ⚑ AUDITED 2026-08-02 against era four's first run (`#431`)
>
> **This sheet has still never been run.** It was swept for the six defect classes era four's nineteen
> returned frames exposed — a state pair that must differ *only in X* while differing in Y, an identity
> requirement across two independent generations, a size floor with an ambiguous subject, an unruled
> glyph, a prohibition contradicting its own subject, and a material pinned to another material's hue.
> **Four found and fixed, one found and handed back, one class clean.**
>
> - **A prohibition contradicting its own subject, twice.** Ruling 4's *"a countable row of lit bars and
>   nothing else"* forbade **frame 11's strikethrough**, which is the mark the sheet's own sharpest moment
>   is carried by; the ruling now names it and every exclusion in it is unchanged. And **frame 1** asked
>   for collars *"along the routes evidence was found on"*, which is the traceable run ruling 1 exists to
>   forbid; **ruling 1 is untouched and frame 1 was fixed**, because this is the prohibition that went
>   missing once already.
> - **A state pair differing in the wrong thing.** Frame 14's proposal was *"a raised outline of each
>   panel only, hollow"* against frame 13's **flush** blanking panels — a difference of fill, and an
>   inversion of the one property frame 13 insists on. Moved onto the one proposal grammar era four's run
>   validated.
> - **A size floor with an ambiguous subject.** Eight frames hold both a panel and a thing on it. Ruled,
>   and ruled so that the no-edge-layer panel cap wins wherever the two rules pull against each other.
> - **An identity requirement across two independent generations.** Nine frames cite another frame's
>   object, and frame 12's *"deliberately indistinguishable on the building itself"* is the strictest
>   instance on any of the four sheets. Anchors named and conditioning prescribed.
> - **An unruled glyph, handed back** as owed item 10: the corner plate's cut bar has no ruled
>   orientation, and a bar is era six's ruled door glyph, so whether era nine may share it is a cross-era
>   call.
> - **A material pinned to another's hue: clean, and deliberately so.** The clad barrier is `#8B959C`
>   against a `#96A1AB` body because *matched* is the ruling, it is measured at a 0.229 value step off the
>   floor on its posts, and `test/intrusionPlateTones.test.ts` holds it. Not touched. The flush collar's
>   own value is unstated and was already owed at item 4.
>
> **Untouched:** the propagation separation, **era nine having no edge layer at all**, and all eight
> rulings.

> ## ⚑ AMENDED AGAIN 2026-08-02, at `integration` `a71b25ce`
>
> **Two things, and neither touches the eight rulings.**
>
> - **The panel rule is re-led** on era four's nineteen returned frames, read one by one: the panel is
>   the default a generator supplies whether asked or not, and what predicts a failed frame is an
>   **unbounded** panel rather than a panel. So the ground section now blocks on the parchment surviving
>   on all four sides — which on this sheet is **`There is no edge layer.` enforced at the frame
>   boundary**, because a floor that runs out of shot carries markings a viewer can imagine following to
>   another building. Era nine has two reasons for that rule where its siblings have one.
> - **Owed item 10 is sharpened rather than answered.** Era four's corner glyph was ruled on 2026-08-02
>   to be the claimant's own mark and expressly *never a bar*, so **two of the four crises now rule a bar
>   out of their own marks and one rules it in** — which makes the cross-era question here more worth
>   asking, not less. Still the lead's, still not invented here.

**These are crisis scenes and not buildings.** No brief here designs a building or the island's land.
Every mass is an era-correct stand-in so a crisis mark has something to sit on.

## The propagation job: **suspecting**, and it is an absence designed as one

D-CRISIS-8 ruled the four propagation crises apart on deliberate axes so a player never meets the same
mental model twice, and `crisis-reference-packs/README.md:176-181` states that separation as a fact
about the **picture** rather than about the mechanics:

| Era | What propagates | Along what | What the player watches | The read |
| --- | --- | --- | --- | --- |
| 1 Hard Winter | Frost | Tile adjacency | An edge, and which way it is moving | **Creeping** |
| 4 Succession | Allegiance | Nothing spatial at all | An object arriving at a plinth | **Tipping** |
| 6 Plague | Infection | Authored links between buildings | A line in the floor, and what has travelled along it | **Reaching** |
| **9 Intrusion** | **Compromise** | **Nothing visible.** Status is hidden per building and the only way to learn it is to read a panel | **A table of readings, and how old each one is** | **Suspecting** |

**Four different visual jobs**: watch an edge, watch an object appear, watch a line, **read a board**.
`README.md:183-186` says nothing in this pass may blur them, so **a shortening pass that made the three
crisis sheets rhyme would destroy exactly what that ruling protects.**

**Era nine's propagation visual is none, and the crisis therefore draws the player's KNOWLEDGE
instead.** Compromise propagates along nothing the player can see; status is hidden per building; a
wrong isolation **relocates** the source; there is no front, no route, no trail and no schedule
(`2026-08-01-intrusion-crisis-art-brief.md:279-285`). **The source is never drawn, and that is a rule
rather than an omission**: anything drawn would either give the answer away or be decorative, and *"the
board's entire content is what the player has learned"* (`:287-293`).

> **A consequence for whoever renders this sheet: the first instinct on this brief will be wrong.**
> Every other crisis in the game gives you an antagonist to design. **This one gives you an
> instrument** (`:296`).

**Unknown must be a positive state or the board looks empty rather than uncertain**, which is *"the row
the whole board rests on"* (`:298-306`). An unread building carries a **lit but blank** matrix: lit, so
it is clearly working and clearly saying nothing; blank, so it is clearly not a reading. A building with
no panel at all would read as outside the crisis, and a dark panel means something else entirely.

Era nine's row against the other three:

- **Against the frost.** *"Era one's board is full before the player acts and era nine's is empty."*
  Era nine's board has nothing on it that moves and nothing the player did not put there: in era one the
  player looks at the world, in era nine at their own notes (`:331-334`).
- **Against era four.** Era four's board is fully known and getting worse and the pressure is the cost
  of acting; era nine's is mostly unknown and the pressure is ignorance. **Era four punishes hesitation
  and era nine punishes impatience** — the sharpest pairing in the set, which is why era four's marks
  say *who holds what* and era nine's say *what the player has found out* (`:336-341`).
- **Against era six.** Both hide something and they hide different things: **era six hides what has
  travelled along a visible network; era nine hides the status of a known thing and has no network at
  all.** *Read the graph and cut it* against *read the board and pay to know more* (`:343-348`).
- **One sentence for a review:** *era nine is the crisis where the board is what the player knows, and
  the only thing that ever gets worse is the accuracy of their own notes* (`:350-351`).

### The collision that binds this sheet hardest: **era nine has no edge layer at all**

**Drawing one would import era six's topology into a crisis that does not have one.** The rule, in both
sources: *"Era nine must never be given an edge layer, because the duct collars are marks about places
and not lines between them"* (`2026-08-01-intrusion-crisis-art-brief.md:346`, and
`crisis-reference-packs/README.md:196-200`). **Era nine's marks say where evidence was found, not what
is connected to what.**

**The risk is specific rather than general, and this rewrite increases it.** Era nine's duct and fibre
markers **genuinely do run along routes in the paving**, so a route in a floor is one short step from a
line between two buildings — the wrong answer is one the subject actively invites. **And the parchment
rule now puts a piece of paving in shot on its own**, where a run of marker with two ends is exactly
what a generator will compose. So the ground section below sizes every panel to make a traceable route
impossible, and **a flush duct marker is a mark on a place**: never a band joining two thresholds, never
continuous from one building to another, never notched, and never anything a viewer could trace to learn
what is connected to what. **If a render of this sheet could be mistaken for a render of era six's, it
is wrong however good it looks.**

**And the one place this sheet's own frame text asked for a route has been fixed rather than left
standing.** Frame 1 said its duct markers *"carry raised collars along the routes evidence was found
on"* — a traceable run, in the one frame that has a whole town in it, fed alongside the ruling that
forbids exactly that. **The ruling is untouched**; frame 1 now asks for marks at places. Worth recording
because this is the prohibition that went missing once already: the second way to lose it is not to drop
it but to leave a frame asking for its opposite.

*(The reciprocal half binds era six rather than this sheet and is recorded so the pair is legible: era
six must never be given a confidence grade. The hedged reading — two segments with the second at half
height — is era nine's, reserved by D-CRISIS-22, and it is the only place in the four packs where a
partial magnitude is drawn.)*

**Frames 6 to 9 are the propagation and frame 6 decides whether the crisis works.** The four panel
readings are the board: **unread** (blank, lit), **clear** (one segment), **likely compromised** (two,
the second at half height), **compromised** (three, full height) (`:312`). Frame 6 is *unread*. **Frame
2 is second** and is the only claim on this sheet a still frame can settle rather than assert — the
collar is the zoomed-out channel, and *"not a nicety"*, because a panel by a door disappears at full
zoom-out and a collar on a ground marker does not. **Frame 11 is third**: when a wrong isolation
relocates the source every reading goes stale, and the board must show that **without deleting what the
player learned**.

## The shared direction

*Read once. Every brief below inherits all of it, and none of them restates it.*

- **One object, isolated on plain parchment `#ECE4D3` and contained within its own footprint.**
  Isometric low-poly, one fixed camera tilted about 49 degrees down, no horizon tilt, framed 1400 by
  900. **The parchment is a background rather than a surface**: the object stands on it, nothing is
  drawn on it, and nothing stands beyond it. There is no ground, no horizon and no sky. Parchment is the
  Art Bible's own ground tone (`docs/Game_Visual_Design_Brief.md:157`), so an object sits on it the way
  it will sit on the island.
- **An Information Age town that hides its infrastructure, four materials.** Unitised curtain-wall glass
  as the body accent `#7FA0A8`, arriving as storey-high units with **a visible mullion and transom grid
  and a spandrel panel at each floor — the grid is the only texture and it must stay regular, because an
  irregular one reads as an earlier era**; anodised and composite rainscreen panel as the body `#96A1AB`,
  matte and close-toned and seamless at a distance, **its narrow open joint the whole of the detail, set
  out deliberately rather than tiled at random**; exposed structural steel, slender and pale, **only
  where it is being expressed** — a canopy, a screen, a mast — because steel that looks structural by
  accident belongs to era seven; and engineered stone cladding, dry and pale and precise, in large thin
  panels with tight joints, **a facing and never a wall**. Flat parapets, and **a shadow gap where a
  building meets the ground rather than a base**. Body and accent sit close together on purpose, so a
  building has very little internal contrast.
- **The era's real absence is not a material: it is visible hand-work of any kind.** Every surface
  arrives finished from somewhere else and is fixed by a bracket you cannot see, so nothing shows that
  a person made it — no board mark, tooled stone, laid course, lashing, rivet or brush stroke. **Eight
  eras carried the evidence of their own making on the outside and this is the era that stops**, which
  is the absence era nine is about.
- **Three tone steps per surface under one upper-left key** — top face lightened about 26 percent, the
  hue on the left, the right darkened about 28. **No runtime lights**: no cast shadow, no ambient
  occlusion, no specular highlight, no rim light, no gradient. **A lit panel face is an emissive surface
  inside the model and never a light added to the scene.**
- **The subject fills the frame**, centred, its silhouette at least two thirds of the frame's height,
  nothing clipped. **Height is measured on the built object only.** *(That clause is
  #411's and is the one part of it the
  parchment does not retire — era one's pass three returned a hearth about 100 pixels tall under a smoke
  column carrying the total to 682, satisfying the number and missing the point.)* **For frames 6 to 9
  this bullet is the whole point**: a matrix panel given a full frame is the difference between countable
  bars and a bright speck. **And where a frame holds two objects, the two thirds is carried by the one
  the frame's mark sits on** — on 6 to 9 the matrix panel itself and not the fragment of wall it is
  mounted on, on 4 and 5 the paving panel the cover belongs to, and on 10 to 14 the building. **The
  paving panel never carries it on a frame that has a duct marker in it**, because that panel is capped
  on purpose by the no-edge-layer sizing; see "When the subject is a piece of ground".
- **One state per frame**, so the sheet stays an asset set rather than a diagram. Every comparison is
  composited afterwards from the single renders, never asked for in a prompt.
- **Every side must read**, because the camera orbits a full 360°, and **the frame carries no label** —
  no caption, legend, annotation, leader line, arrow, numeral or text. The reading key is this document.

**Absent on purpose, because each is era ten's signature move:** emissive surface used as a whole face,
exposed conduit and cable tray run across an elevation, and the deck carried over the older ground.

### The eight rulings a picture can break

**The rule that cut 49 fed clauses to eight: a prohibition survives only if breaking it produces a
picture that is wrong about the DESIGN rather than one that is merely ugly.** Everything the parchment
retired went with the ground it was about. The generic ones went on era one's measured ground that its
failed run held essentially all of them without being asked. **What replaced the rest is a change of
grammar**: era two's briefs carry **zero** *"no X"* clauses across all ten briefs, measured, and separate a
confusable pair by naming the axis instead, which is what every *"must not resemble"* below does.
**Eight rather than seven, and the extra one is the point**: *there is no edge layer* was missing
outright from an earlier cut — not carried in prose and then dropped, simply absent — **which is a worse
failure than over-cutting**, because era nine's duct markers do run along routes and the wrong answer is
one the subject invites. **Feed these eight verbatim, last, and add nothing.**

> - **There is no edge layer.** Nothing joins one building to another: no line, band, link, route, edge,
>   path or run of anything. **A duct or fibre marker is a mark on a place** — it never meets two
>   thresholds, never runs continuously between buildings, is never notched, and is never anything a
>   viewer could trace to learn what is connected to what.
> - **Everything the crisis adds to the town is the town's own anodised clad panel `#8B959C` on posts
>   `#646B70`**, and **nothing in the frame is more saturated than the era's own glass accent
>   `#7FA0A8`.** No high-visibility colour and no warmth anywhere in what the crisis adds.
> - **A lit panel is a bright face, not a light source, and it lights nothing.** This is not night and
>   not dusk.
> - **A panel shows a countable row of lit bars, and on a stale reading one horizontal bar beneath the
>   row. Nothing else.** No text, numeral, letter, icon, graph, waveform, map or face on any face.
> - **A void is a dark solid shape you cannot see into**, with nothing in it and nothing lit inside it.
> - **There is no visible intruder** — no agent, marker, trail, icon or anything representing whoever is
>   doing this.
> - **Everything is clean, intact and maintained**, and an isolated building is **sealed, not boarded**:
>   blanking panels flush and in the building's own module.
> - **No mastery gold `#FFB703`.**

**Why each survived, for the reviewer rather than the generator.** **No edge layer** is the collision
this sheet is bound hardest by and the one prohibition here that is absolute; see the section above for
why the risk is specific. **Nothing warm** is the most heavily measured ruling on the sheet: era nine's
own style guide rules that **warm means floor**, so a warm barrier says *floor* at the one object whose
job is to say *this floor is open here*. Ruled 2026-08-01 at
`2026-08-01-intrusion-crisis-art-brief.md` §3.2a, on blue-minus-red over the pack — era nine's ground
family runs -15 to -9, its built and added family +6 to +41, and the two rust barriers the plates
originally drew sat at -126 and -138; saturation across the pack's 25 material tones tops out at 0.297
(`#7FA0A8`) against the barriers' 0.838 and 0.843. **The case for the rust orange was not empty** and is
recorded rather than dismissed: a high-visibility barrier round a lifted floor cover genuinely reads as
maintenance rather than as alarm, and what it could not survive is that era nine already spends warmth on
the ground. The read did not weaken — the clad post is a wider step off the floor on value than the rust
one was, 0.229 against 0.197, and the void stays the darkest thing on the paving at 0.031 against the
floor's 0.373. `test/intrusionPlateTones.test.ts` holds the ruling. **A lit panel lights nothing** because
the panels are the brightest things in the frame and a dark scene would make them look wonderful and would
be a lie. **Bars and nothing else** because a countable row is the mechanic, and text or a graph is the
generative default for anything shaped like a screen; *the stale strikethrough is named inside that ruling
as of 2026-08-02, which closes a contradiction rather than opening a door.* Frame 11 requires **a
horizontal bar drawn underneath the row of three** in `#39423F` — a mark on the face that is not one of
the lit row — so the earlier form, fed verbatim as instructed, forbade the one frame this sheet calls *the
crisis's sharpest moment*. Every exclusion is unchanged, and the exception is one shape, in one place, on
one of the fourteen frames. **A dark solid void** because anything visible inside
it turns the subject from a hole in a pattern into a piece of infrastructure. **No visible intruder**
because the temptation to draw something is the failure mode the rule exists for, which is why it survives
though no run has broken it (`:287-296`). **Sealed rather than boarded** because boarding is what a
generator reaches for and it would make an isolated building read as abandoned rather than as switched out
of the town. **Mastery gold** is reserved outright across every era.

### When the subject is a piece of ground

**Six frames have a subject that is ground itself**: the inspection cover at 4 and 5, and the duct-marker
collar at 2, 10, 11 and 12. *"No ground in the picture"* and *"the subject is a piece of ground"* need
reconciling, and here getting it wrong costs twice — **it reintroduces the floating slab, and it
reintroduces the edge layer.**

**A piece of ground is drawn as a made object, never as a piece of terrain.** A paving panel is a
manufactured thing — thousands of small precise units in banded patterns, laid over service voids rather
than on soil, squared to a module — and it goes on the parchment as any other object does: complete,
centred, within its own footprint.

**The rule that blocks a frame is that the panel is BOUNDED, and on this sheet it does two jobs at
once.** It used to sit behind *"only a mark that is IN the floor gets a panel"*, which is a rule about
**whether** a panel may appear; era four's nineteen returned frames, read one by one on 2026-08-02,
settle that the wrong half was leading. There: **fourteen frames are sent straight onto the parchment
and fourteen of fourteen came back standing on a paving panel**, so that clause was obeyed **zero
times**; **eleven** of those panels were bounded and cost nothing; the paving ran to **all four frame
edges in four** frames; and **the one frame that lost its subject was an unbounded one**. **The defect
tracks unboundedness rather than the panel's presence.**

> **The parchment is visible on all four sides of everything in the frame, and no paving ever touches a
> frame edge.** Whatever is in shot — object, panel, or an object on a panel — sits complete inside the
> frame with plain parchment round it.

**Here that rule is not only about the slab: it is the no-edge-layer prohibition enforced at the frame
boundary.** A panel that runs off the edge of the frame is a floor whose markings continue out of shot,
and **anything a viewer can follow out of shot is something they can imagine following to another
building** — which is the one thing this sheet may never draw. So era nine has two reasons for the same
rule where the siblings have one, and it is the stricter of the pair that governs: **on any frame with a
duct marker in it, a panel touching a frame edge is a failed frame even if nothing else is wrong with
it.**

**So a bounded panel under something that merely stands on the floor is tolerated rather than
requested** — under a building, a barrier, a blanking plate. It is not a defect and not worth a
regeneration. **But it is never described here, never conditioned on, and never given the height
floor**, because a panel the brief did not ask for is scenery the generator added and describing it
makes it a second subject. **Only a mark that is IN the floor gets a panel that is part of the
SUBJECT** — described, sized by the rule below, and conditioned on its anchor.

**The panel and the slab separate on the edge.** A made panel ends where a paving unit ends: its outer
edge is a **squared arris in the floor's own granite, one unit thick**, and the panel lies flat on the
parchment with nothing beneath it. A floating slab ends in **a section through the ground** — a thick
body with an underside, a torn or tapered edge, soil or rock below, parchment visible under its far side.
The first is engineering, the second is landscape lifted out, and the second is what came back four times
on era one.

**A third edge came back on era four that neither of those describes, and it is the parchment's own
doing.** Three of its panel frames ended in **a torn, deckled sheet edge** — paving on a ragged
rectangle of textured paper — so the parchment stopped being a background and became a *sheet* lying in
the picture. **A panel's edge is engineering**: a squared arris in the floor's own granite, one unit
thick, and never torn, deckled, ragged, feathered or vignetted. **A ragged edge is doubly wrong here**,
because era nine's whole material argument is that every surface arrives finished from somewhere else,
and a torn edge is hand-work.

**And the panel is sized so that nothing on it can be traced, which is the no-edge-layer rule enforced in
geometry.** A panel carries **one** marker or **one** cover. Its duct marker is a short mark set into the
paving that **begins and ends inside the panel and reaches no edge of it**, so there is no run leaving the
frame and nothing for a viewer to follow. **A panel must never contain two buildings, two thresholds, or a
marker that touches its own boundary.** If a reviewer can put a finger on a marker and follow it toward
anything, the frame has drawn era six's crisis.

**So describe a panel by its material, never by its size.** *"Only a few cells of ground at most"* was
tried on era one and read as permission to draw ground with a visible edge, which is the slab; that
phrasing is deleted and must not come back. Say the panel is precise banded unit paving in grey-brown
granite `#A9A49A` over a deeper cut `#948F86`, with its bands running in a deliberate pattern, and let its
extent follow from the one object set into it.

**Which of the two objects carries the two-thirds height floor, because a panel and a thing on it are two
candidates and this sheet has both in eight frames.** The shared direction now rules it, and the warrant is
era four's first run, where the panel was the taller object in all four boundary-stone frames and
`boundary-stone-unmarked.png` measures about **90 percent** of frame height for the panel against about
**37** for the stone the countable mark sits on — `#411`'s hearth under the smoke column, with a paving
panel standing in for the smoke. **On 4 and 5 the paving panel carries the
floor**, because the subject is a cover set flush in the pattern and a flush thing has no height of its
own to measure; nothing there can be traced, so a large panel costs the no-edge-layer rule nothing.
**On 10 to 14 the building carries it and the paving panel must not**, because that panel holds a duct
marker and the sizing above caps it at one marker reaching no edge — which is the case where the two
rules would otherwise pull against each other, and the no-edge-layer rule wins.

### Read the plates for shape only

**The plates draw the failure this rewrite undoes, and that is measured rather than asserted.** Era one's
pack gives its seven detail plates no horizon at all and their subjects occupy **18.2 to 25.0 percent** of
frame; the three new packs give every plate a horizon, spending **68 to 72 percent** of frame height on sky
and water, and their detail subjects occupy **3.9 to 15.6 percent** — no overlap between the two sets.
**Intrusion's own `02-lifted-cover-and-barrier.png` measures 3.9 percent, the smallest subject in any of
the twenty-seven plates**, and its `03-status-panel-four-readings.png` 12.2. Method and command in era
one's retired sheet.

**So every citation below reads *shape from*, and it means the object's silhouette and proportions and
nothing else — never the camera, the ground, the sky, the framing or the side-by-side arrangement.**

## The fourteen frames

| # | Subject | Image |
| --- | --- | --- |
| 1 | The whole scene: an immaculate town with its floor open | `wide-master.png` |
| 2 | The same reading near and far | `two-distances.png` |
| 3 | The unsolved ending | `unsolved-ending.png` |
| 4 | A closed inspection cover | `cover-closed.png` |
| 5 | A lifted cover, with barriers | `cover-lifted-with-barriers.png` |
| 6 | A panel lit and completely blank | `panel-lit-blank.png` |
| 7 | A panel showing one bar | `panel-one-bar.png` |
| 8 | A panel showing two bars | `panel-two-bars.png` |
| 9 | A panel showing three bars | `panel-three-bars.png` |
| 10 | A building compromised and still working | `building-compromised.png` |
| 11 | A building carrying a stale reading | `building-stale-reading.png` |
| 12 | A building clear | `building-clear.png` |
| 13 | A building isolated | `building-isolated.png` |
| 14 | A proposed isolation | `building-isolation-proposed.png` |

**Frame 10 is used twice**, which is why fourteen rather than fifteen: a building with a three-bar panel
over a raised doubled collar is both the live half of the stale-reading sheet and the *compromised and
still working* state of the building sheet. Read off the plate calls at `0cb08e7e` they are the same
object — `StatusPanel -Segments 3` over `DuctMarker -Collar "doubled"` at
`tools/generate-winter-crisis-references.ps1:2201-2202` for plate 04's near building and again at
`2216-2217` for plate 05's live one. **Render frame 10 first**; two sheets depend on it.

**Frames 1, 2 and 3 are the frames that ask for ground, so they carry all of the residual risk.** Frame
2's whole subject is one frame containing two distances, which no compositing arrangement recovers; frame
3's is a proportion across a whole town. The parchment rule is suspended for those three and no others.
**Render them last**, after the eleven asset frames prove out, so that if they fail they fail alone.

## How the comparison sheets get assembled

**Composited from the single renders and never generated** — a layout job: no retouching, no
regeneration, no relighting. **Tile, do not scale**: each panel keeps its own 1400 by 900 frame at full
size. The panels butt, with no gutter, rule, border or caption, and the reading key is this document
(`README.md:206-209`).

| Sheet | From | Must read |
| --- | --- | --- |
| `lifted-cover-and-barrier.png` | 4, 5 | **The break in the pattern.** The floor on the left is continuous and on the right it has a hole in it, and **the dark void is the loudest thing in the sheet**. The barriers are quiet and the eye lands on the opening |
| `status-panel-four-readings.png` | 6, 7, 8, 9 | Bars **countable** as one, two and three at this distance **and in greyscale**, with no colour difference between panels. The half-height second bar reads as deliberately shorter rather than as an error. The blank panel reads as working and saying nothing |
| `stale-reading.png` | 10, 11 | Three bars countable on **both**, and the right one reads as old news rather than as a panel that has broken or switched off |
| `building-states.png` | 12, 10, 13, 14 | The second is **deliberately indistinguishable from the first on the building itself** — the compromise lives on the panel and the ground marker and nowhere else. The third's **dark panel must be distinguishable from a lit blank one**, which is what the blanking panels are for |

**Two can only be checked once tiled and both are fragile** — countability across four separately
generated panels, and *"indistinguishable on the building itself"* across two, are exactly the
comparisons a single frame used to guarantee by construction. **If either fails, the finding belongs in
the owed list and the remedy is a paired render rather than a looser claim.** Note which way the risk
runs: the old structure guaranteed the comparison and lost the subject, and a legible subject needing a
second pass to line up is the better trade.

### Every sheet here needs one object twice, so each needs an anchor

**Every *"the cover and panel of frame 4"*, *"the panel of frame 6"* and *"the building, panel and marker
of frame 10"* is an identity requirement across two independent generations, and two text prompts do not
return the same object.** Owed item 8 records the risk. What it does not carry is a production step, which
is what the risk actually needs.

**And era nine's instance is the strictest on any of the four crisis sheets.** Frame 12's *"deliberately
indistinguishable from the first on the building itself"* is not a means to a claim, it **is** the claim:
era four's *"otherwise identical"* at least had a panel to point at as the one permitted difference, where
this asserts that a viewer will find no difference at all across two separate generations.

**Era four's first run is the measurement, since era nine has never been run.** All four of that sheet's
anchors diverged: three frames of one building came back as three different buildings, six frames of one
pedestal as six different pedestals, four frames of one boundary stone at four different heights and camera
distances, and one counting slab as three slabs in two materials. The nineteen also came back at three
different frame sizes, against the same *"tile, do not scale"* rule this section carries.

**So the anchors are named, and every dependent is generated from the anchor's returned image rather than
from its description.** **Frames 4, 6 and 10 are the anchors** — frame 10 first, as this sheet already
says. Condition 5 on 4; condition 7, 8 and 9 on 6, so that one panel's rim, bezel and face carry through
all four readings; and condition 11, 12, 13 and 14 on 10. The anchor fixes the frame size and the camera as
well as the object, because both are part of *"identical"* and both are what make a tile legal.
**"Indistinguishable on the building itself" is a claim about a conditioned render and is not available
from a text prompt** — and unlike the bar counts it cannot be salvaged by loosening, because loosening it
deletes what `building-states.png` exists to establish.

## The run sheet: `imagegen-run-sheet.jsonl`, fourteen jobs in three passes

**Executable straight through, top to bottom, and the anchor structure is in the file rather than in its
ordering.** Every line carries `frame`, `step`, `pass`, `role`, `anchor` and `input` beside era four's own
`out`, `prompt` and `size`, so a variant names the anchor it derives from and gives the absolute path of
the image to condition on. Ordering alone would have left that implicit, and implicit is how era four's
first run came back as three different buildings.

| Pass | Steps | Frames | What it is |
| --- | --- | --- | --- |
| `1-anchors` | 1-3 | **10**, then 6, then 4 | Text-to-image. **Judge all three before spending anything on pass 2** |
| `2-variants-of-the-anchors` | 4-11 | 11, 12, 13, 14 ← 10; 7, 8, 9 ← 6; 5 ← 4 | Image-to-image |
| `3-scene-frames` | 12-14 | **2**, then 1, then 3 | Text-to-image. No anchor, and the parchment rule is suspended |

**Eight of the fourteen are image-to-image and that is not a preference.** Frame 10 goes first because two
comparison sheets depend on it and four frames derive from it, and because frame 12's requirement — that
it is *deliberately indistinguishable from frame 10 on the building itself* — is the strictest instance on
any of the four crisis sheets. It is also the one that cannot be salvaged by loosening.

**Every variant prompt carries the same two paragraphs**, and the second of them is a defect era four's
anchored pass actually produced. The first pins the anchor's camera, scale, crop and margins. The second
says *do not re-fit the camera to a taller subject*: `#455` records that an anchored variant re-fitted its
camera to what it had added, **so the pedestal read smaller in the variant than in the anchor** and the
pair could not be tiled as one object in two states. **This sheet is the most exposed of the three to
that**, because frames 6 to 9 are a small object given a whole frame on purpose: a variant that backs off
to fit a third bar takes the countability claim with it.

**Order within the passes is this sheet's own two orderings honoured together.** *"Render frame 10
first"*, *"frame 6 decides whether the crisis works"* and *"frame 11 is third"* rank what has to be judged
early; *"render 1, 2 and 3 last"* is about where the residual risk is. Both hold: 10 and 6 are steps 1 and
2, frame 11 is step 4, and frame 2 leads the scene pass rather than the sheet.

**Every frame is 1248x1248.** That is era four's delivered size, chosen because the comparison sheets tile
without scaling and because **1254 is not a multiple of sixteen**, which the generator needs. The shared
direction's *"framed 1400 by 900"* is not a legal size on either axis, and era four's first run — three
different frame sizes across nineteen frames, so that no sheet could be tiled at all — is what a set with
no single pinned size produces.

**The eight rulings are fed verbatim and last in every prompt**, no-edge-layer first, including the
2026-08-02 clause inside ruling 4 that names frame 11's strikethrough.

**Every frame with a paving panel in it carries the panel cap as well as the panel description**, because
on this sheet the bounding rule is the no-edge-layer prohibition enforced at the frame boundary: one
marker or one cover per panel, beginning and ending inside it, reaching no edge of it, and never two
buildings or two thresholds in one panel.

**Where this sheet describes a collar or a cover in words, the run sheet gives a hex**, because
`apps/web/src/city/three/intrusion-tones.ts` now pins one: a cover face `#918D84` with its lit face
`#BCB8B0` and shaded edge `#706C66`, a duct marker `#807D75`, a collar ring `#5F5C56` with its lighter top
`#C3BFB8`, the stale notch `#3D454A`, and the isolation plate's cut bar `#A6AAAE`. Those are the plate
generator's own values and its own `Darken`/`Lighten` amounts — *"about 44 percent darker with a lighter
top face"* is `Darken(Floor, 0.44)` over `Lighten(Floor, 0.30)` — and `test/crisisToneTables.test.ts`
recomputes every one of them.

---

### 1. The whole scene: an immaculate town with its floor open — `wide-master.png`

**A scene frame**, so the shared direction's first bullet does not bind it: it has ground and sky, and
the parchment rule is suspended for this frame alone.

**Silhouette.** A stylised low-poly isometric toy Information Age town on a small round island,
immaculate and sealed, late in a flat grey day, **with its floor open in a dozen places**. Nobody is
present.

**Materials.** Three anodised grey-blue buildings `#96A1AB` with curtain-wall glass `#7FA0A8` in the same
family, flat parapets, and **a dark shadow gap where each meets the ground rather than a base**. The
floor is precise banded unit paving on structure in grey-brown granite `#A9A49A` over a deeper cut
`#948F86`, kerbed `#7D786F`, its bands running in a deliberate pattern across the whole open area. Lush
layered planting, entirely artificial in fact and maintained perfectly throughout. **Late, flat and
colourless**: one neutral grey key well down in intensity, a flat cool grey sky `#B9BFC2`, haze `#ADB4B8`
pulled in a little. Water `#7F96A0`.

**The marks.** **Half a dozen inspection covers lifted and leaning** against the paving beside their
openings, each void dark and solid-edged `#2C3236`, each ringed by low temporary barriers in the town's
own matched anodised clad panel `#8B959C` on posts `#646B70`, quiet against the warmer floor. **Flush
duct markers** set into the paving carry raised collars **at the places evidence was found**, cut from the
floor's own stone, **each a short mark at its own building's place**: no marker runs from one building to
another and none of them can be followed anywhere, because this is the frame with a whole town in it and
therefore the frame where era six's topology would arrive by accident. **A small illuminated matrix panel
on the wall beside each door**, in a dark bezel
`#464F55` behind a rim `#5D686E`, its face `#C3DAE3` carrying a row of one, two or three small bright bars
`#F4FDFF`. A small clad pavilion has its door standing open.

**What must read.** **A town that is not damaged and not dirty and is nonetheless in trouble, and a
precise pattern with holes punched in it.** The lit panels are the brightest things in the frame while
lighting nothing around them.

**What it must not resemble.** **A construction site**, which is where an open floor with barriers round
it goes. They separate on **access against work**: nothing is being built, nothing is excavated, no
material is stacked, no plant stands anywhere — a cover has been lifted by somebody with a key and set
down beside its own hole. It must equally not read as a night city, a cyberpunk street, a data-centre
interior or a disaster scene.

**Shape from** `intrusion/01-wide-master.svg` — and for this frame alone, its camera, paving and massing
too.

---

### 2. The same reading near and far — `two-distances.png`

**A scene frame, and the clearest case on any of the four sheets for keeping one whole.** The claim is
that the wall panel stops carrying the fact **at the distance** the ground collar keeps carrying it. That
is a statement about one frame containing two distances, and two renders at two scales are two renders at
two scales, not one view of a town.

**Silhouette.** One anodised grey-blue building close to the camera and two much smaller, more distant
ones of the same type behind it, on banded unit paving, showing the same fact at two distances. Island
depth, one frame.

**Near.** The large building carries a lit matrix panel showing **three full-height bars** `#F4FDFF` on a
face `#C3DAE3` in a bezel `#464F55`, and in the paving in front of it a flush duct marker carries a
**raised doubled collar** — two rings standing proud of the floor, cut from the floor's own stone about 44
percent darker with a lighter top face.

**Far.** Behind it, one building of the same type carries **the same three-bar panel, now too small to
count**, a bright speck on the wall, while its duct marker's **doubled collar is still clearly raised and
still clearly doubled**. Beside it, a second distant building carries a one-bar panel and a **flush**
collar, level with the paving.

**Materials.** All three buildings are the same unitised anodised grey-blue type `#96A1AB` with glass
`#7FA0A8`, flat parapets and a shadow gap at the ground line, on banded unit paving `#A9A49A` over
`#948F86`.

**What must read.** **A viewer must be able to tell the two distant buildings apart from each other by
their ground markers alone, with the panels too small to help.**

**What it must not resemble.** **A frame that has helped the far panel**, which is the one way this
subject fails. **No panel is enlarged, tilted toward the camera or given a leader line**: the far panel is
genuinely too small to count and that is the point. The collars are geometry standing proud of the floor
and never a coloured ring, a painted circle, a decal or a glowing one. Nothing is out of focus anywhere.
**And no marker joins one building to another** — each is a mark at its own building's place.

**Shape from** `intrusion/04-two-distances.svg` (`ps1:2200-2208`), including its depth arrangement and
collar states.

---

### 3. The unsolved ending — `unsolved-ending.png`

**A scene frame, kept whole.** Its subject is *"the pattern is restored almost everywhere and is still
broken in a few places"*, which is a proportion across a whole town. One cover cannot carry it.

**Silhouette.** The same town after a crisis that ended without being solved, **under ordinary fair
daylight with part of its floor still open**. The crisis light has gone: an ordinary bright day, a warm
calm sky, ordinary daytime shadows.

**Materials.** As frame 1 — anodised grey-blue `#96A1AB` with glass `#7FA0A8`, flat parapets, a shadow
gap at the ground line, precise banded unit paving `#A9A49A` over `#948F86`, planting lush and perfectly
maintained.

**The marks.** Most of the paving has **closed back up**: covers flush, squared to the module, aligned to
the joints, the banded pattern running unbroken through them. But in **two or three places the covers are
still lifted and leaning**, their voids dark `#2C3236`, their low clad barriers `#8B959C` on posts
`#646B70` still standing round them. **Under fair daylight the dark voids are what carry this frame**,
exactly as under the crisis light, and the barriers stay quiet. **One building still carries flush
blanking panels over its openings** in its own module, with the small angled service isolation plate at
its front lower corner and its wall panel dark. **Every other building's wall panel is gone, because the
crisis is over.**

**What must read, at any zoom and without reading a single panel: the pattern is restored almost
everywhere and is still broken in a few places**, and the town is otherwise entirely back to normal. The
contrast between a closed cover and a still-open one has to be visible **in the floor alone**.

**What it must not resemble.** **A punishment.** They separate on **unfinished against ruined**: this is a
job nobody got round to completing, so the mood is calm rather than grim and nothing here is a ruin, a
disaster aftermath, a condemned building, an abandoned town or a decayed one.

**Shape from** `intrusion/01-wide-master.svg` for the town, paving and massing, `02-lifted-cover-and-barrier.svg`
for the closed and lifted covers, and `06-building-states.svg` for the isolated building. **There is no
plate for this frame.**

---

### 4. A closed inspection cover — `cover-closed.png`

**Silhouette.** One closed inspection cover set flush into a panel of banded unit paving, **squared to
the module and aligned with the joint lines so it reads as part of the pattern** rather than as something
apologised for.

**Materials.** The cover's face is the floor's own stone about 14 percent darker, and **the pattern of the
floor runs straight through it**. The panel is precise banded unit paving in grey-brown granite `#A9A49A`
over a deeper cut `#948F86`, thousands of small units in a deliberate banded pattern, its outer edge a
squared arris one unit thick, lying flat on the parchment — see "When the subject is a piece of ground".

**What must read.** **A cover that belongs to the pattern** rather than a lid dropped on top of it. This
frame is half of a pair whose subject is a break in the pattern, so **the continuity here is the
subject**: the banded pattern must be plainly unbroken across the cover.

**What it must not resemble.** **A manhole in a road**, which is what a round-shouldered lid in a floor
becomes. They separate on **module against intrusion**: this cover is squared to the paving's own unit,
sits on its joint lines, and is a piece of the pattern — where a manhole is a foreign circle apologised
for by a ring of patching. It is equally not a sewer, a hatch, a trapdoor or a pothole, and nothing here
is cracked, rusted, bent or forced.

**Shape from** `intrusion/02-lifted-cover-and-barrier.svg`, left half.

---

### 5. A lifted cover, with barriers — `cover-lifted-with-barriers.png`

**Silhouette.** The cover and panel of frame 4, the cover **lifted and leaning against the paving beside
its opening, standing on its edge**. The void beneath is **open, dark and solid-edged in `#2C3236`**. Low
temporary barriers stand round the opening, and **the paving's banded pattern is visibly interrupted**.

**Materials.** The barriers are the town's own matched anodised clad panel: rail `#8B959C`, two upright
posts `#646B70`, **cooler than the floor and a value step down from it** — the same material the town
seals a building's openings with.

**What must read, and it is the whole subject: the break in the pattern, and the dark void is the loudest
thing in the frame.** The barriers are quiet and the eye must land on the opening rather than on them.

**What it must not resemble.** **A road works**, which is the single likeliest thing a generator will
produce here, because it is what a real lifted floor cover has round it. They separate on **matched
against high-visibility**, and the separation is a measurable bound rather than a list: the barriers are
the town's own clad panel, and **nothing in the frame is more saturated than the era's glass accent
`#7FA0A8`, which is 0.297.** Hazard orange and a chevron stripe are what a generator reaches for and
both sit far outside it. **A barrier brighter or warmer than the hole it surrounds is the one way this
frame fails**, because it takes the eye off the subject. **The void is a dark solid shape you cannot see
down into**, holding nothing and lighting nothing. **The cover was lifted by somebody with a key**:
nothing is damaged or forced, and this is not an excavation.

**Shape from** `intrusion/02-lifted-cover-and-barrier.svg`, right half.

---

### 6. A panel lit and completely blank — `panel-lit-blank.png`

**Silhouette.** One small illuminated matrix panel on a fragment of anodised grey-blue building wall,
**mounted flat so it lies in the wall's own plane rather than facing the camera**, lit and carrying no
bars. Given a whole frame, **the panel is large enough that its bezel, rim and face are three distinct
objects.**

**Materials.** A rim `#5D686E` round a dark bezel `#464F55` round a face `#C3DAE3`, its face bright. The
wall is unitised anodised grey-blue panel `#96A1AB` with its narrow open joints set out deliberately.

**What must read.** **A panel that is working and saying nothing, which is a different fact from a panel
that is switched off.** This is the hardest of the four panel frames, because the difference between
*nobody has looked at this building yet* and *this building is switched out of the town* is carried here
and in frame 13 and nowhere else.

**What it must not resemble.** **A screen**, which is what a lit rectangle becomes. They separate on
**object against display**: this is a small fixed thing on a wall with three distinct parts and a face
that emits without illuminating, so **the bezel and the face are never both lifted** — or the panel
becomes one bright rectangle with no object in it — and it throws no glow, halo or spill onto the wall.
It is not a phone, a tablet, a television, a traffic signal, a lift indicator or a HUD element.

**Shape from** `intrusion/03-status-panel-four-readings.svg`, first panel (`ps1:2187`, `-Segments 0`).

---

### 7. A panel showing one bar — `panel-one-bar.png`

**The panel of frame 6**, carrying **one bar `#F4FDFF` at the left of the face, full height** — a lit
shape standing on the face rather than a lit region of it, so its edges are hard.

**What must read.** **One, countable, and countable in greyscale.**

**What it must not resemble.** **A partly lit face.** They separate on **shape against region**: the bar
has hard edges and sits within the face with unlit face visible either side of it. No bar is coloured, no
panel differs in colour from another, the bezel and face are never both lifted, and the panel lights
nothing.

**Shape from** `intrusion/03-status-panel-four-readings.svg`, second panel (`ps1:2189`, `-Segments 1`).

---

### 8. A panel showing two bars — `panel-two-bars.png`

**The panel of frame 6**, carrying **two bars `#F4FDFF`: the first full height, the second only half the
height of the first.**

**What must read.** **Two, told apart from one and from three at a glance, and the half-height second bar
reading as deliberately shorter rather than as a rendering error or a partly lit bar.** That last point is
why this frame is separate from 7 and 9: at a quarter of a shared frame the half bar looked like a fault,
and at a full frame it can look like a decision.

**What it must not resemble.** **A bar chart.** They separate on **rung against measurement**: the two
bars are one ladder rung of a four-rung set, so they share a baseline, a width and a spacing, and the half
height is the only variable. Nothing is graduated, numbered or scaled.

**Shape from** `intrusion/03-status-panel-four-readings.svg`, third panel (`ps1:2191`, `-Segments 2`).

---

### 9. A panel showing three bars — `panel-three-bars.png`

**The panel of frame 6**, carrying **three bars `#F4FDFF`, all full height.**

**What must read.** **Three, countable at a glance and in greyscale**, and plainly the top of the ladder
rather than a face that is simply mostly lit.

**What it must not resemble.** **A signal-strength meter**, which is exactly what three ascending marks
become. They separate on **equal against ascending**: all three bars are the same height and the same
width, so the reading is a count and never a magnitude.

**Shape from** `intrusion/03-status-panel-four-readings.svg`, fourth panel (`ps1:2193`, `-Segments 3`).

---

### 10. A building compromised and still working — `building-compromised.png`

**Silhouette.** One anodised grey-blue building **as built, with nothing whatever added to the building
itself**, standing beside a panel of paving carrying its duct marker.

**Materials.** Unitised anodised grey-blue `#96A1AB` with curtain-wall glass `#7FA0A8`, a flat parapet and
a shadow gap at the ground line. On its wall a **three-bar lit panel**: bars `#F4FDFF` on a face `#C3DAE3`
in a bezel `#464F55` behind a rim `#5D686E`. In the paving in front of it a flush duct marker carrying a
**raised doubled collar**, two rings standing proud of the floor, cut from the floor's own stone about 44
percent darker with a lighter top face. **The panel of paving holds this one marker and the marker reaches
no edge of it.**

**What must read, and it is the whole subject: the compromise lives on the panel and on the ground marker
and nowhere on the building.** The building must be drawn so it is **indistinguishable from a clear one**
(frame 12), because that is the fact the composited sheet exists to establish. Both carriers must be
legible: three countable bars, and a collar plainly standing proud rather than flush.

**What it must not resemble.** **A building that has been marked.** They separate on **carrier against
body**: the building is not tinted, dimmed, greyed, outlined or altered in any way, and every fact lives
on the two carriers. The collar is geometry standing proud of the floor, never a coloured ring, a painted
circle, a decal or a glowing one — and it is **a mark on a place**, going nowhere.

**Shape from** `intrusion/06-building-states.svg`, second mass (`ps1:2231-2232`, `-Segments 3` over
`-Collar "doubled"`), the same object as plate 04's near building (`ps1:2201-2202`) and plate 05's live
one (`ps1:2216-2217`).

---

### 11. A building carrying a stale reading — `building-stale-reading.png`

**The building, panel and marker of frame 10**, with **the same three bars still showing** and still
countable as three, in a **dimmer tone `#9DB0B7` on a face dropped to about half brightness `#78878E`**,
with **a horizontal bar drawn underneath the row of three** in `#39423F`. Its duct-marker collar is **still
raised and still doubled, with a single cut notch across it**. **Nothing is blanked and nothing is
removed.**

**What must read.** **The building still shows exactly what it showed, marked as no longer current.** A
viewer must count three bars and read this as **old news rather than as a panel that has broken or switched
off.** The cut notch across the collar must be visible **as a notch rather than as damage**.

**What it must not resemble.** **A broken display**, which is where a dimmed panel goes, and this is *the
crisis's sharpest moment* — *"you knew this and it no longer counts"* — so it must survive. They separate
on **legible against failed**: the panel is dimmer but whole and its three bars are still cleanly
countable, with no static, scan line, noise, pixel corruption, interference or error symbol, and nothing
flickering or cracked. The single horizontal bar beneath the row is the only strikethrough. **The notch is
a clean cut in stone**, not a crack, a chip or a break.

**Shape from** `intrusion/05-stale-reading.svg`, right building (`ps1:2219-2220`, `-Segments 3 -Stale` over
`-Collar "notched"`).

---

### 12. A building clear — `building-clear.png`

**The building and panel of frame 10 exactly, as built**, with a **one-bar lit panel** on its wall and a
**flush collar** on its duct marker, **level with the paving**.

**What must read.** **An ordinary building that has been looked at and found clear.** The flush collar is
the half most likely to be lost: it must read as **deliberately level with the floor** rather than as a
collar that failed to draw, so the ring's outline has to be legible in the paving. **This frame and frame
10 must be identical in the building itself**, the only differences being the bar count and whether the
collar stands proud.

**What it must not resemble.** **A marker that failed to draw.** They separate on **flush against
absent**: a flush collar is a ring whose outline is cut in the paving and whose top face sits exactly level
with it, so it is a visible ring of a different cut rather than nothing at all.

**Shape from** `intrusion/06-building-states.svg`, first mass (`ps1:2228-2229`, `-Segments 1` over
`-Collar "flush"`).

---

### 13. A building isolated — `building-isolated.png`

**The building of frame 10** with **flush blanking panels set into the curtain-wall module over every
opening**, in the building's own panel material and its own module lines **so it reads as sealed rather
than as boarded**, plus **a small angled service isolation plate at its front lower corner carrying a
single cut bar**, plus **its wall panel dark and unlit**: bezel `#394045`, face `#262B2F`, rim `#2F353A`,
no bars.

**What must read, and it is why the blanking panels matter: the dark panel must be distinguishable from a
lit blank one** (frame 6). A dark readout means the building is switched out of the town; a lit blank one
means nobody has looked at it yet. The blanking panels make the difference unmistakable, so they must be
plainly present and plainly flush.

**What it must not resemble.** **A boarded-up building.** They separate on **module against
improvisation**: the blanking panels are the building's own material in the building's own grid, flush
with the wall and fixed by a bracket you cannot see — where boarding is a foreign material, cut to fit,
standing proud and nailed on. It is equally not a ruin: every line of the silhouette survives, parapet
included. **The corner plate carries one cut bar and nothing else.**

**Shape from** `intrusion/06-building-states.svg`, third mass (`ps1:2234-2236`: `ShutterPlates` in the
era's own `Clad`, then `-Segments -1`, then a doubled collar).

---

### 14. A proposed isolation — `building-isolation-proposed.png`

**The building of frame 10**, with the blanking panels of frame 13 drawn as **proposals on the one
proposal grammar the crisis sheets share**: **each whole panel rendered see-through at a little over half
opacity**, sitting flush in its own module position exactly as the committed one does, the opening legible
through it and the wall edge never hidden behind it, made of the **dark end of the building's own family
rather than the pale end** so it stays visible against the wall. **Its wall panel is still lit** with three
bars `#F4FDFF`, **because nothing has been committed yet**, and there is no corner isolation plate.

**What must read.** **The same seal as frame 13, not yet made.** The proposals are the blanking panels' own
silhouettes at the same size and in the same module positions, differing from frame 13's in nothing but
being see-through and a step darker. **The still-lit panel is the second half of the reading and must not be
dark**, since a dark panel would say the isolation had happened.

**Not a raised outline, and that is 2026-08-02's change.** This frame used to ask for *"a raised outline of
each panel only, hollow"*, which differs from frame 13's panels in **fill** rather than in translucency and
inverts the one property frame 13 insists on: those panels are **flush**, and a raised outline stands proud,
so the proposal was more physically present than the thing it was proposing. Era four's first run returned
that exact instruction as a solid dark raised moulding with its own shading — committed masonry, no
translucency in it at all (`era-04-succession-crisis-scenes/README.md`, "One proposal grammar").

**What it must not resemble.** **A UI overlay** — a hologram, a projection. They separate on **material
against display**: the proposal is the building's own panel rendered as an outline, so it keeps the module,
the grid and the exact positions, and it arrives without the apparatus that says *interface* — no dashed
line, hatching, crosshair, cursor, arrow or drop shadow. Nothing is boarded, damaged or a ruin.

**Shape from** `intrusion/06-building-states.svg`, third mass, plus the proposal treatment from
`hard-winter/09-building-protection-states.svg`, third mass, which is era one's ghosted shield. **This state
is not in plate 06**, whose three masses are `clear`, `compromised` and `isolated` (`ps1:2228-2236`).

---

## Owed to the lead, and not invented here

> ### What the 2026-08-03 tones pass settled, and what it did not
>
> **Settled, because pinning the tones is what settles it:** every hex on this sheet now lives in
> `apps/web/src/city/three/intrusion-tones.ts` with its source named, the barrier-tone ruling is carried
> into it with all five of its measurements, and the tones the frame briefs gave only in words — the
> cover and its two faces, the duct marker, the collar and its lit top, the stale notch, the isolation
> plate and its cut bar — have hexes for the first time (item 1). The tone halves of items 4 and 10 close
> with them.
>
> **Still open and NOT settled by a tone table, because none of them is a colour:** what emissive
> intensity a panel runs at (item 2); whether a three-segment ladder is countable at the shipped camera
> (item 3); how far above the paving a raised collar stands (item 4's other half); the two readings never
> drawn on a building (item 5); how many buildings carry a panel (item 6); whether a wrong isolation can
> be cleared, and the diagnostic budget (item 7); whether the bar counts survive tiling (item 8); whether
> the parchment rewrite holds (item 9); **what shape the corner plate's glyph is, and whether era nine
> may use era six's bar at all** (item 10's other half); the proposal's opacity (item 11); and the
> atmosphere preset, recorded under item 1.

**Era nine's crisis is unbuilt, so unlike era one nothing here can be checked against shipped geometry.**
Measured at `0cb08e7e`: only the Hard Winter ships. `engines/game/src` carries `hard-winter.ts`,
`hard-winter-tuning.ts` and `crisis-damage.ts`, and its one generic file `mid-era-crisis.ts` names no
crisis at all. Nothing under `apps/web/src/city/three/` draws a matrix panel, a duct collar, an inspection
cover or a blanking plate. **Treat these renders as the first draft of the design rather than as pictures
of it.** The one exception is the barrier tone, which was ruled against measurements taken over the plates
and is recorded with the eight prohibitions above.

1. **SETTLED 2026-08-03: `apps/web/src/city/three/intrusion-tones.ts` now exists.** `#96A1AB`, `#7FA0A8`,
   `#A9A49A`, `#948F86`, `#8B959C`, `#646B70`, `#C3DAE3`, `#F4FDFF` and `#2C3236` come from era nine's
   style guide and the plate generator's `$ERA9` table, and they are pinned there along with everything
   the frame briefs described in words rather than in hex: the cover and its two faces, the duct marker,
   the collar and its lit top, the stale notch, and the isolation plate's cut bar. Each entry says which
   of four things it is — the style guide, `$ERA9`, a literal one of the generator's crisis primitives
   draws, or a documented `Darken`/`Lighten` of one of those — and **the barrier-tone ruling is carried
   into it with all five of its measurements, every one of which reproduces at this tip.**

   `test/crisisToneTables.test.ts` censuses every `$ERA9` role in both directions, recomputes every
   derived tone with the generator's own `MixHex`, and re-derives `BARRIER_POST` from `BARRIER_RAIL` the
   way `test/intrusionPlateTones.test.ts` re-derives it from `$ERA9.Clad` — so the plate guard and the
   tone guard now read the same reference point from opposite ends and cannot drift apart. **The plates
   are still guarded rather than a renderer**, which is the half of this item that has not changed: era
   nine has no renderer, and a tone table is a pinned decision rather than geometry.

   **What is still owed is the atmosphere preset.** `crises/era-09-intrusion.md` §2.1 is eleven rows of
   direction — *"neutral grey"*, *"down substantially"*, *"pull the far plane in a little"* — with no
   numbers, and a `CrisisAtmosphere` wants thirteen values, so an `INTRUSION_LIGHT` would be eleven
   invented ones. That is a different question from owed item 2 below, which is about the panel and not
   about the rig.
2. **What emissive intensity a panel runs at.** The sheet's longest-standing owed item and **not
   answerable on paper**. Frames 6 to 9 carry the plate's face and bar tones and the rule that the bezel
   and the face are never both lifted, and that is the whole of what is decided. **The rewrite makes this
   cheaper to settle**: a panel given a whole frame on a plain ground is the first render on which an
   intensity judgement is worth making.
3. **Whether a three-segment ladder is countable at the shipped camera, and at what zoom it stops being.**
   INV-CRISIS-16 wants countable in greyscale at any zoom where the panel is visible at all. **That is a
   renderer claim** and era nine has no renderer; frames 6 to 9 and frame 2 are the evidence that would
   settle it.
4. **How far above the paving a raised collar stands, and how a flush one reads.** The flush-against-raised
   distinction carries the zoomed-out channel and *flush* is the harder half: a collar level with the
   paving may read as one that failed to draw. No geometry exists to measure. **The tone half closed on
   2026-08-03 and the height half did not**: `intrusion-tones.ts` pins the ring at `#5F5C56` and its lit
   top face at `#C3BFB8`, so a flush collar has a cut outline to be legible by rather than only an
   absence — but how far proud a raised one stands is a number, and there is still nothing to measure it
   against.
5. **Two of the four readings are never drawn on a building.** Frames 12 and 10 draw *clear* and
   *compromised*; **no frame draws an unread building or a likely-compromised one.** That follows the
   plate, whose building block has three masses, but it means the collar half of the ladder is only ever
   seen at two of its four rungs. Whether the board needs the missing two is the lead's call.
6. **How many buildings carry a panel.** The brief's §4.3 assumes every building does, because unknown has
   to be a positive state, and notes that at era nine's building count the panels could become the dominant
   visual element. Frame 1 draws a panel by every door and frame 3 draws none, which is the two ends of that
   question.
7. **Whether a wrong isolation can be cleared, and the size of the diagnostic budget.** Both named as owed
   in the brief's §10. The first decides whether the blanking panels ever come off mid-crisis, which would
   add a fifth building state and a fifteenth frame; the second is called the single most consequential open
   number in the crisis and decides how ordinary the ending in frame 3 is.
8. **Whether the bar counts survive being tiled rather than drawn together.** The pre-`#410` version drew
   all four panels in one frame where a generator could keep them consistent by construction. **That is a
   real risk the restructure introduced and this rewrite does not remove**, and the same applies to
   *"indistinguishable on the building itself"* across frames 10 and 12.
9. **Whether the object-on-parchment rewrite holds.** Applied from era two's ten building briefs, which
   produced usable images, and from era one's four measured failures, every one of which was a failure of
   ground. **Era nine has never been run**, and it has the strongest prior of the three, because its
   subjects are the smallest of any sheet's and subject size is what era one's run actually failed on.

   **Era four's run of the same rule was read frame by frame on 2026-08-02, and it changed which half of
   the rule this sheet leads with** (`#431`). Its subjects came back in their frames and none was a
   section through terrain; **the panel became the default** — fourteen frames sent to bare parchment,
   fourteen panels; **eleven of those panels were bounded and cost nothing**; **four frames ran paving to
   all four edges**; and **the one frame that lost its subject was unbounded**. So expect a panel under
   everything here rather than a bare field, and **judge it on whether the parchment survives on all four
   sides**. Written into "When the subject is a piece of ground" above, where on this sheet it also
   carries the no-edge-layer prohibition to the frame boundary.

   **Era nine's exposure is the opposite of era four's and is worth naming.** Era four's tolerated panels
   sat under pedestals and buildings, which are large; **era nine's subjects are a matrix panel and a
   collar in the paving**, the two smallest in the four packs, so a panel that grows to fill the frame
   here does not merely become the picture — it takes the two-thirds height floor with it and leaves the
   countable bars a bright speck. That is why the height rule and the panel cap are written to pull the
   same way rather than against each other.
10. **What the corner isolation plate's glyph is, and whether era nine may share era six's. The TONE was
    pinned on 2026-08-03 and the GLYPH was not** — `intrusion-tones.ts` holds the plate at `#4C565C` and
    its cut bar's lit wall at `#A6AAAE`, which decides what the mark is made of and nothing about what
    shape it is. Frame 13
    asks for *"a single cut bar"* and **does not rule its orientation**, where era six rules its door mark
    to be *a single **horizontal** cut bar* — so era nine's plate is a partly unruled glyph, and the part
    that is ruled is the shape era six owns. **Era four's half of this closed on 2026-08-02 and the
    closure sharpens the question rather than answering it.** Era four's corner marker is now ruled to
    carry the claimant's own mark, the chevron or the ring, and expressly *"never a bar, which is era
    six's ruled door glyph and would hand one crisis's mark to another"*
    (`era-04-succession-crisis-scenes/README.md`, frame 13 and owed item 6). So **two of the four crises
    now rule a bar out of their own marks and one rules it in**, and era nine is doing by design what era
    four is now ruled out of doing by accident. That may well be right — a service isolation plate and a plague door are not going to be
    confused with each other, and era nine's is on a small angled plate at a corner rather than across a
    door — but it is a cross-era decision and **not invented here.** Two questions for the lead: whether
    the bar is era nine's to use, and what orientation it takes. **Era four's first run is why this is
    worth asking rather than assuming**: given a mark with no shape ruled, it returned a serifed **I**, a
    character, which that sheet forbids outright.
11. **NEW 2026-08-03: what opacity a proposal is drawn at. A gap this sheet had rather than an answer it
    lost.** Frame 14 asks for each blanking panel *"rendered see-through at a little over half opacity"*
    in *"the dark end of the building's own family"*. **Both halves are era four's**, borrowed with the
    proposal grammar this sheet adopted on 2026-08-02 and never carried into its own owed list — era
    four's item 3 records that the wording came from era one's `ghostWinterShield`, which ruled it for
    era ONE's pale ground, and that era four had no ghost of its own to read a value off. Era nine has
    none either.

    **The tones pass does not settle it and could not**: an opacity is not a hue. It is also the one
    open question here with a shipped precedent saying the arithmetic will be wrong —
    `winterFireGhost.ts` had to raise its ramp off a photograph because *"a translucent wash over
    near-white snow composites to a pale tint whatever the arithmetic says"*. **Era nine's case is the
    inverse of that and no easier**: a proposal here sits over the building's own panel at 0.349 of
    linear luminance rather than over pale stone, and *"the dark end of the family"* against a body that
    already has very little internal contrast is the era's hardest separation. **What the tone table
    adds is somewhere for the answer to go**: a ruled proposal tone is a named entry beside
    `BLANKING_PANEL` rather than a phrase in a prompt. **Team lead, and it binds era six's frame 3
    identically.**

## Related

- `docs/superpowers/specs/2026-08-01-intrusion-crisis-art-brief.md` — the art brief these serve, and §3.2a
  for the barrier-tone ruling
- `docs/superpowers/specs/crisis-reference-packs/intrusion/` — the six plates, cited for shape only
- `docs/superpowers/specs/crisis-reference-packs/README.md` — the mechanic inventory, the propagation
  reading at 176-186, the no-edge-layer ruling at 196-200, the pack conventions
- `docs/superpowers/specs/eras/era-09-information/style-guide.md` §2 — the four materials, and the era's
  real absence
- `docs/Game_Visual_Design_Brief.md:157` — parchment `#ECE4D3` as the house ground tone
- `test/intrusionPlateTones.test.ts` — holds the barrier-tone ruling over the plates
- `output/imagegen/era-02-neolithic-building-briefs/README.md` — the working style this follows
- `output/imagegen/era-01-hard-winter-fire-and-shield/README.md` — retired, and the four measured failures
  this rewrite is founded on
