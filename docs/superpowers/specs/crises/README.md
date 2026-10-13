# Mid-era crisis design and asset briefs

**Nine documents, one shape.** These are the presentation specs for the nine mid-era crises that
have not been built: eras two through ten. Each is written so a designer and an implementer can
both work from it without asking a question.

**Measured at:** `origin/integration` `952a0983`, on 2026-07-30. Every figure below was taken off
that tree or off a named open pull request, not recalled.

**Scope:** presentation only. Every mechanic is ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`, and where a mechanic is ruled these
documents describe how it looks and how it reads. Where a ruled mechanic turned out to be hard or
impossible to render, the brief says so in its own section 11 rather than quietly changing it.

## Why this set exists

Era one's crisis, the Hard Winter, was built mechanically first and its presentation was decided
incidentally by whoever wrote the JSX. The mechanics came out sound. The presentation did not, and
the team lead named four failures at once: a flat blue screen, a fire that reads badly, action
controls that read badly, and an island that looks like a sunny afternoon while a blizzard runs.
A separate ruling then rejected the **copy register** as well.

**The instruction for eras two through ten is that the design is specified before anyone
implements.** That is the whole reason for this folder.

## The relationship to era one's brief

Era one's own brief is `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md`, on
**#302**. Read at that branch's tip
while these nine were written.

**#302 is OPEN, not merged.** Checked with `gh pr view 302`: `mergedAt` is `null`. So era one's
brief is a document in a pull request and not yet a document in the tree, and everything below that
inherits from it inherits from a diff.

**Its structure is adopted here**, which is what makes the ten read as one set. **Its copy register
is deliberately not adopted**, for the reason in the copy rules below.

### The section map, so the ten line up

Era one's brief has ten sections. It is retrofitting a crisis that exists, so its section 1 is
*"What is on screen now, and what is wrong with it"*, which nothing here can have. These nine also
owe four things era one's brief does not carry: a layout at both widths, a damage-and-consequence
section, accessibility, and open questions.

**So the nine run era one's sections in era one's order, with four inserted.** The inserted ones
are named in the table so the divergence is a documented extension rather than drift.

| Era one's brief | These nine | Note |
| --- | --- | --- |
| 0. The hard boundary | 0. The hard boundary | Shortened, and points here |
| 0b. What IS available | 0b. What is available | Same |
| 1. What is on screen now | **1. The crisis, and what the player does** | **Substituted.** Nothing is on screen for these nine |
| 2. The atmosphere direction | 2. The atmosphere direction | Same six axes, same subsection numbers |
| 3. The frost | 3. The hazard | Same slot: the antagonist |
| 4. The fire | 4. The player's own mark | Same slot: the thing the player places |
| 5. The option cards | **5. The crisis surface**, then 6. The option cards | **Inserted.** The layout at 460 and 920 |
| 6. The forecast box | 7. The read-out panel | Same slot |
| (none) | **8. Damage and consequence** | **Inserted** |
| 7. The copy | 9. The copy | Same slot |
| (none) | **10. Accessibility** | **Inserted** |
| 8. The consolidated asset list | 11. The consolidated asset list | Same slot, same table shape |
| 9. Desirable, and genuinely unbuildable | 12. Desirable, and genuinely unbuildable | Same slot |
| (none) | **13. Open questions** | **Inserted**, each addressed to an owner |
| 10. References | 14. References | Same slot |

## The nine at a glance

Ritual and cadence are quoted from D-CRISIS-19 and section 5.20 of the crisis spec. The **light
instinct** column is the thing this folder exists to catch early: per crisis, the effect an artist
would reach for that this renderer cannot draw.

| Era | Crisis | The ritual: in this crisis, I... | Cadence | Light instinct that is unbuildable |
| --- | --- | --- | --- | --- |
| 2 Neolithic | [The Lost Herd](./era-02-lost-herd.md) | Follow and compare clues | Choose an investigation, then answer to set the quality of the information | Lantern light on a search party at dusk |
| 3 Bronze Age | [The Raid](./era-03-the-raid.md) | Redirect visible routes | Answer, then act | Torches carried by raiders, and a lit watchfire on the headland |
| 4 Classical | [The Succession Crisis](./era-04-succession-crisis.md) | Bank and spend political influence | Answer repeatedly, bank, then one larger decision | Braziers burning in a contested district |
| 5 Medieval | [The Great Fire](./era-05-great-fire.md) | Choose irreversible sacrifices | Answer to earn permission, then accept a cost | The fire itself, and firelight falling on the buildings near it |
| 6 Early Modern | [The Plague](./era-06-plague.md) | Close movement links temporarily | Answer to earn permission, then accept a cost | None. Era six is the only one of the nine with no light instinct at all |
| 7 Industrial | [The Boiler Cascade](./era-07-boiler-cascade.md) | Diagnose and repair in order | Inspect freely, answer to execute | Firebox glow, sparks, a red-hot pipe |
| 8 Atomic | [The Missile Alert](./era-08-missile-alert.md) | Assign responses before simultaneous resolution | Plan several responses, resolve them together | Klaxon flash, searchlights, the flash of an impact |
| 9 Information | [The Intrusion](./era-09-intrusion.md) | Choose diagnostic questions | Choose an investigation, then answer to set the quality of the information | A screen glowing into a dark room |
| 10 Cyberpunk | [The Robot Uprising](./era-10-robot-uprising.md) | Reconfigure the city's power state | Planning phase, alter the grid, then resolve it a step at a time | A beacon that draws the robots, and neon panic |

**Era ten is the one place where the light mechanic is buildable**, because it is subtractive:
switching a building off is removing an emissive lift from a face, which is exactly what this
renderer can do. Section 12 of era ten's brief works that through.

---

## The hard boundary, shared by all nine

These are measured facts about this renderer, verified at `952a0983`. A brief that breaks one
produces art that cannot ship, so they are stated once here rather than nine times. Era one's brief
states the same boundary at its section 0 and the two agree; where this folder has re-measured
something, it says so.

### There are four lights in the whole scene and they are all global

`apps/web/src/city/three/CityLighting.tsx` is one `hemisphereLight`, one `ambientLight`, one
shadow-casting `directionalLight` as the key, and one `directionalLight` as a rim. A sweep of
`apps/web/src` for `pointLight`, `spotLight`, `rectAreaLight` and their class forms returns
**nothing**. Nothing in the world can be lit locally. **Four lights for the whole city, not four
per object.**

### There is no post-processing, and enabling it means adding a package

A sweep for `EffectComposer`, `UnrealBloom`, `postprocessing` and `Bloom` under `apps/web/src`
returns **nothing**, and `@react-three/postprocessing` is **not a dependency**:
`apps/web/package.json` carries `@react-three/drei` and `@react-three/fiber` and no third. So bloom
is a dependency decision, not a feature flag.

### Emissive is a bright face, and it is shipped precedent

Four call sites in the city scene: `PlacedBuilding.tsx` lifts a GLB material's own emissive to
**1.2**, `MasteryStars.tsx` runs **0.75** and **1.35**, `GhostBuilding.tsx` runs **0.4**, and
`Roads.tsx` runs **0.3**. Three more do the same 1.2 lift on off-scene canvases.

**So a bright emissive face is not exotic here, it is shipped, and these briefs lean on it
confidently.** What it does not do is spill: the surface gets brighter and its surroundings do not
change at all. No falloff, no pool on the ground, no light on a neighbouring wall.

### There are no image textures anywhere in the city

`apps/web/public` holds exactly one folder and it is `audio`. The only texture in the entire
renderer is a **`CanvasTexture` drawn procedurally in code** at `StarterIsland.tsx:670`, for the
faint tile grid. A sweep of the sources for `TextureLoader`, `useTexture`, `<Environment`, `envMap`,
`RGBELoader` and for `.png`, `.jpg` and `.webp` references returns **nothing**.

**So an asset table full of PNGs is unbuildable.** If a designer hands back a bitmap there is
literally nothing to plug it into. Every asset entry in these nine briefs is one of six kinds:

| Kind | What it is | Precedent in the tree |
| --- | --- | --- |
| **GLB** | An authored model loaded through the existing glTF path | Every building; `PlacedBuilding`'s `GlbFadeLayer` |
| **Geometry** | Procedural three.js geometry assembled in code, flat-shaded, one hex per mesh | `StarterIsland.tsx`, `WinterGround.tsx`, `Roads.tsx` |
| **Material** | A material or colour change on existing geometry | `reviveMaterial`, `GhostBuilding`'s tint lerp |
| **CanvasTexture** | A texture drawn procedurally onto a canvas in code | `StarterIsland.tsx:670`, and that is the only one |
| **DOM** | A CSS-rendered overlay in the 2D UI layer | `hard-winter.css`, `winter-in-city.css` |
| **SVG** | Inline SVG in the 2D UI layer | `apps/web/src/lessons/svgKit.tsx` and every lesson widget |

**Where a crisis genuinely wants a painted surface, the brief says so and costs it as standing up a
texture pipeline first.** No brief here lists a bitmap as though it were ready to consume.

### There is no environment map, so nothing can be glassy

Materials across the island run `metalness: 0` and roughness around 0.94. There is nothing for a
reflective surface to reflect and no path to reflect it. **Ice, chrome, water, polished metal and
glass can be pale and faceted; they cannot be glassy.**

This reaches four of the nine directly and each says so in its own section 12:

- **Era nine**, whose entire signature move is *"the sealed reflective skin"* and whose buildings
  are specified to show *"a reflection of the sky and the next building along"*.
- **Era ten**, whose ground strategy is a **wet reflective deck** carrying the signage down onto the
  floor as colour, and whose water is *"lit from the edges and from below"*.
- **Era eight**, whose plate glass and aluminium trim are two of its four materials.
- **Era six**, whose lead domes are its accent.

### Nothing tints a building at runtime

`faceTones()` in `apps/web/src/city/palette.ts` computes the three-tone model
(`lighten(hue, 0.26)` / `hue` / `darken(hue, 0.28)`) and **no renderer calls it.** Verified: a sweep
of `apps`, `packages` and `engines` finds `faceTones` and `buildingFaces` referenced only by their
own definitions and by `palette.test.ts`. On the 3D island a building's colour is baked into its
GLB by the Gridwork export, and `reviveMaterial` only restores flat shading and the emissive lift.

**This is the single most reshaping constraint in this folder, because eight of the nine crises mark
a building.** A burning building, an infected one, a failed machine, a compromised one, a
faction-held one, a powered-down one, a shuttered one: every one of those is a state on a building,
and **not one of them can be a colour change.**

> **The shared consequence, stated once: a crisis marks a building with ADDED GEOMETRY.** A plate,
> a hood, a boarded opening, a tilted mass, a standing marker at its corner. Geometry also survives
> full zoom-out and satisfies the never-hue-alone rule for free, so the constraint pushes in the
> direction the design wanted anyway. The alternative is new code, and every brief that would need
> it says so in its section 12 rather than assuming it.

### Fog is per-scene and distance-based only

`CityScene.tsx` attaches a linear fog from `islandRadius * 3` to `islandRadius * 20`. There is no
height fog and no volumetric scattering, so there are no god rays and no ground-level murk.
**There is also no fog of war:** fog is one setting for the whole scene and cannot hide a region.
Era two and era nine both hide state, and both do it with ground decals and markers rather than
with darkness.

### Shadows are one map from one direction

The key light casts PCF soft shadows at 2048 square over a frustum sized to the island. Shadow
colour is not a parameter that exists in this path.

---

## What is available, which is the more useful half

**Geometry, without limit in kind.** Every visible thing on the island except the buildings is
procedural three.js geometry assembled in code. `StarterIsland.tsx` is over 1,500 lines of it.
Anything describable as a shape can be built.

**Silhouette.** The camera is fixed in angle. Silhouette against the sky and against the ground is
the channel that survives full zoom-out, and the era folder already rules that **grain survives
distance better than height does**.

**Flat colour per mesh, and vertex colour.** A mesh gets one hex. A geometry can also carry
per-vertex colours, which is how the lagoon's shallow-to-deep ramp is done today. That is a real
gradient tool and it costs nothing.

**Flat shading as the house style.** `flatShading: true` on a `MeshStandardMaterial` gives every
facet its own normal, so a low-poly form reads its planes crisply under the one key light.

**Emissive as a bright face**, at up to about 1.35 without looking out of place.

**Animation on the frame loop.** `useFrame` is available and already used: gulls fly circuits, the
mastery stars bob, buildings cross-fade between stages. **Every one is gated on
`prefers-reduced-motion` and yours must be too**, holding a posed still frame rather than
disappearing.

**Particle meshes.** There is no particle system, but several hundred small meshes or one
`InstancedMesh` can be posed on the frame loop.

**A shared ground-decal depth ladder.** Flat things laid on the ground do not fight for depth,
because they sit on a single uniform ladder of 0.05-unit rungs (`GROUND_DECAL_STEP`), continued
through the road stack and then through the winter layer (`winterCourseTop`). **This is the cheapest
place in the whole renderer to put new art.**

**The light, sky and fog numbers are yours.** `lightSpec()` returns nine numbers and
`cityEnvironment()` returns a background and a fog colour. Adding a crisis entry is a table row, and
it changes the entire island at once. **It is the highest-leverage lever available to every one of
these nine briefs and it costs almost nothing.**

---

## The per-cell decal reach, measured per era

Era one's brief found that its crisis grid covers 88 cells inside radius 22 while the drawn grass
disc has radius 30, so a per-cell ground decal reaches only half the island and leaves a green ring
around the settlement. **That does not generalise, and the direction of the problem flips at era
three.** Checked rather than assumed.

**At `952a0983` none of the nine has a radius at all.** `eraBuildableRadius` throws for every era
but `prehistoric`, and the message says so: *"Era has no authored buildable radius yet."* So this
question is not answerable from the tree today.

**It is answerable from #298, which is
OPEN** (`gh pr view 298`: `mergedAt` is `null`). That PR authors all ten radii as
**22 / 30 / 36 / 43 / 47 / 51 / 55 / 61 / 65 / 69**. The table below reproduces the cell counts from
those radii using the shipped centre rule, and it lands on **88 cells at radius 22** and **936 at
radius 69**, both of which are figures #298 asserts itself, so the derivation agrees with theirs at
both ends.

| Era | Radius under #298 | Cells | Cell area | Against the drawn grass (radius 30, area 2,827) | What the crisis owes |
| --- | --- | --- | --- | --- | --- |
| 1 | 22 | 88 | 1,408 | **49.8%.** A green ring all the way round | A cap disc out to radius 30. This is era one's finding |
| 2 | **30** | 172 | 2,752 | **97.3%**, and the radius is exactly the grass radius | **A fringe only.** The square cell grid inscribes the round disc, so what is left is a thin scalloped edge, not a ring |
| 3 | 36 | 256 | 4,096 | **Past it.** Era three is the first era whose buildable disc leaves the drawn grass | **Clip to the drawn island.** The problem inverts |
| 4 | 43 | 368 | 5,888 | Past it | Clip |
| 5 | 47 | 432 | 6,912 | Past it | Clip |
| 6 | 51 | 524 | 8,384 | Past it | Clip |
| 7 | 55 | 608 | 9,728 | Past it, still inside the lagoon (radius 58) | Clip |
| 8 | 61 | 732 | 11,712 | Past the grass **and past the lagoon** | Clip, and the overhang is now over open sea |
| 9 | 65 | 820 | 13,120 | Past both | Clip |
| 10 | 69 | 936 | 14,976 | Past both | Clip |

**The honest reading, and it is a finding rather than a detail.** #298's own test records that the
island art has not grown to match: it asserts `ISLAND_GRASS_RADIUS` is still 30 and `SEA_RADIUS`
still 58, and its comment says the radii *"are a design figure until that lane lands"*, with island
growth gated on the road layer's depth budget. So from era three onward, **a ground layer drawn at
the authored buildable radius would paint cells over water and off the drawn island.** Every brief
here that lays a ground layer states that it must clip to the drawn island, and names the clip in
its asset list and in its section 12.

**Which of the nine actually inherit it**, checked brief by brief rather than assumed:

| Brief | Ground layer it lays | Verdict |
| --- | --- | --- |
| 2 Lost Herd | Searched-ground course, per cell | **The one good case.** Radius 30 equals the grass radius, so it owes a fringe piece and no cap and no clip |
| 3 Raid | Route studs and churned metalling | Clip. Item **B9** in its asset list |
| 4 Succession | **None.** Boundary stones along the paving's own joint lines | **Unaffected.** The only one of the nine that lays no ground layer at all, and section 2.2 of that brief records the clipping problem as one reason |
| 5 Great Fire | Ash fall, per cell | Clip. Item **A8** |
| 6 Plague | Link bands, per link rather than per cell | Clip, and a smaller problem: a band between two outlying buildings can still route across ground that is not drawn |
| 7 Boiler Cascade | Standing water in the channels, cold clinker | Clip. Item **A6** |
| 8 Missile Alert | Target hatching, per zone | Clip. **The worst case**, because radius 61 is past the lagoon as well as the grass. Item **A7** |
| 9 Intrusion | Lifted covers and duct-marker collars | Clip. Item **A6** |
| 10 Robot Uprising | Deck seams and markers | Clip. **The widest gap of the ten** at radius 69 against a drawn grass radius of 30. Item **A6** |

---

## The copy rules, which are a ruling and not a style note

**Do not inherit era one's register.** The Hard Winter's copy frames the player's accuracy as
purchasing power, and the lead has rejected it: *"make it less purchase oriented and more results
oriented (this is what you earned); generally just make the language easier to use and less like
elevated."*

### 1. Results, not purchase

**What the player's work earned them, never what their score bought.** This matters beyond one
screen because several of these nine share the shape that produced it, accuracy converting into
action strength, so the purchase frame is the natural thing to reach for and it is wrong every
time.

The distinction to hold: **material genuinely is spent and may be described that way; the player's
correct answers must not be.**

| Do not write | Write |
| --- | --- |
| See what you bought | Here is what your answers found |
| Decide how much it is worth | Decide how far it reaches |
| Three correct answers buys the wide search | Three correct answers searches the whole valley |
| You paid for a weak result | Two of three correct, so the search covered one field |
| Riding on this: | (delete it, and say what the action does) |

Words to sweep for in every copy section: **worth, cost, price, buy, bought, pay, paid, spend,
spent, afford**, and any construction where correct answers are described as currency. The sweep is
manual, because nothing mechanical will do it (see rule 4).

### 2. Plainer language

Say what happened and what to do next. Do not narrate the player's situation back at them and do
not editorialise about the stakes. Era one has a live example of what to avoid: a panel headed
*"Batch answered"* with a callout reading *"Riding on this:"* and a bare *"0 of 3 right so far."*

Each brief's section 9 writes every string out in full. A string described rather than written is a
string somebody else writes, which is how *"start a fire"* and *"pull everyone in"* happened.

### 3. Every answered question shows the solution, correct or wrong

**Non-negotiable, and era one shipped without it.** Crisis questions are drawn from lessons the
player was already taught, so a miss is the highest-value moment for feedback in the whole game, and
**showing the solution only on a miss turns feedback into an accusation.**

The shared specification, which every brief's section 9 places into its own question surface:

> **After a question is answered, the solution appears in the same panel, below the answer field,
> without the player asking for it.** It is present on a correct answer and on a wrong one, in the
> same position, in the same treatment, with the same heading. The only difference between the two
> cases is the verdict mark above it.
>
> **It is feedback, not a second chance.** The answer field is now read-only, the verdict is already
> recorded, and nothing in this panel can change the tally. There is no retry control and no
> "try again" affordance, because the batch score is what the declared action rests on.
>
> **It reads as the worked solution, not as a scolding.** Heading: **How this one works.** Then the
> worked steps for that item. Where the item has an authored worked solution the crisis shows it
> unchanged, because it is the same item bank the lessons use.
>
> **It does not advance anything.** The player moves on with the panel's own control. Nothing here
> is on a timer (see the clockless rule).

### 4. Nothing mechanical will catch a regression in any of this

Stated in every brief so nobody assumes a gate exists. The repository bans the em-dash in
learner-facing strings at the error tier, but the check lives in
`.cursor/skills/author/scripts/validate-lesson-pack.mjs`, whose file collector accepts `*.json` and
nothing else, and CI invokes it through `scripts/check-lesson-packs.sh` over `content/lessons/*/`
and nowhere else. **It has never been able to see a single string in a crisis surface.** Era one's
brief measured this rather than assuming it: an em-dash injected into a live option card left the
CI gate reporting seven domains, 36 packs, zero errors, exit 0.

The prose scanner that could read TSX, `scan-lesson-text.mjs`, is **in no CI step at all**, and it
applies only its rejected-claims rule to TSX sources rather than the em-dash rule.

**So on crisis surfaces the em-dash rule, the purchase-register rule and the plain-language rule are
all enforced by a reviewer and by nobody else.** Every brief in this folder says so in its own
section 9.

**These ten documents were swept by hand, and the sweep was proved rather than trusted.** At the
commit that added them, a search of this folder for U+2014, U+2013 and the other Unicode dashes
returns nothing. **Non-vacuity was demonstrated by injection:** with one em-dash appended to
`era-02-lost-herd.md` the same search reports `era-02-lost-herd.md:1` and exits 0, and after the
revert it reports nothing and exits 1. **A regression after this point will not be caught by
anything**, which is the whole reason the measurement is written down.

### 5. The shared declare sentence is a KNOWN DEFECT in the six shelved briefs

**Two independent reviews found eight of the nine briefs carrying one declare sentence with the noun
swapped**, in the section 9.1 table of each: *"Pick a {thing}, then answer {n} questions. How many
you get right sets {outcome}."* Era four's brief is the ninth and carries no declare line at all, so
the template reached every brief that had one.

**That is the *"one encounter in the hand"* failure D-CRISIS-19 exists to forbid**, and the crisis
spec §5.41 says where it bites: across shelved designs it is a tidiness problem, and across shipping
ones it is that ruling's failure arriving through the briefs.

**Fixed in the two briefs anybody will build, and deliberately not fixed in the other six.** The
in-scope set is eras 1, 4, 6 and 9 (D-CRISIS-31 as amended by D-CRISIS-33). Era one's crisis is
built and era four's brief has no declare line, so the defect touched exactly two shipping briefs
and both are rewritten:

| Brief | Declare body |
| --- | --- |
| [6 Plague](./era-06-plague.md) §9.1 | **Rewritten.** Its own ritual: an edge or a node, a closure that lifts, duration as what accuracy sizes, and the day passing as a separate decision |
| [9 Intrusion](./era-09-intrusion.md) §9.1 | **Rewritten.** Its own ritual: a check that changes nothing on the board, a usable hedge at the bottom rung, and a finite diagnostic budget |

**The six shelved briefs keep the template**, and this is a scope decision rather than an oversight:
eras **2, 3, 5, 7, 8 and 10** still carry it. They cost nothing until somebody builds them, and
editing six shelved documents to fix a defect no player can reach spends a reviewer's attention on
the wrong six. To see the population that still carries it, grep this folder's `era-*.md` for
`| Declare body | Pick a`, which is a cheaper check than a list that can go stale. **It returns six
lines today**, one per shelved brief, and none from the rewritten two even though both quote the
template in order to name it. Grep the folder rather than the briefs and it returns a seventh line,
which is this paragraph.

> **Un-shelving a crisis owes this fix.** A brief coming off the shelf is a brief somebody will
> build, so its declare body stops being untidy and becomes D-CRISIS-19's failure mode. Rewrite it
> in the same pass as D-CRISIS-32's other un-shelving obligations, from that brief's own section 1
> and section 5, which already declare a distinct ritual and cadence. **The defect was never that
> the sentence was badly written; it was that eight briefs said one thing in eight voices.**

---

## The crisis carrier set, shared across all nine

This is the vocabulary the nine draw from, so a player who has learned to read one crisis can read
the next. **Most of it already ships.** Every entry names at least two independent channels, because
**INV-CRISIS-16 forbids a state carried by hue alone**, and it is asserted in real Chromium against
computed styles.

| Role | Channels | Where it already exists |
| --- | --- | --- |
| **Hazard on a cell** | A full-cell slab on its own rung, plus the era's hazard relief | `WinterGround` rung `frozen`, tone `0xDCE8F2` |
| **The hazard's next step** | A second slab one rung up, one tone step colder or darker, so the edge reads as an edge at zoom-out | `WinterGround` rung `frostLine`, tone `0x9FC0D8` |
| **Ground the player is holding** | A warm slab plus the player's own standing mark on it | `WinterGround` rung `warded`, tone `0xC98A4B` |
| **Provisional gain, not committed** | A raised four-bar **outline**, never a fill, plus a **numeric badge** giving the score that reaches it | `WinterGround.addOutline`, `WINTER_PREVIEW_TONES`, `hw-cell__need` |
| **Provisional loss, not committed** | A raised outline in the loss tone plus a **cross glyph**, deliberately not sharing the gain preview's classes | `WinterGround` rung `previewAbandon`, tone `0x8E4B58`, `hw-cell__lose` |
| **Ruined building** | A **stage swap** to the ruin template: silhouette collapse plus a cold neutral tone. Still a click target, still carrying its lesson | `ruinStage.ts`, `RUIN_PLACEHOLDER_TONES` |
| **Scarred ground** | A full-cell slab on the island's `worn` rung in the dead char tone | `ScarredGround.tsx`, `SCAR_PLACEHOLDER_TONE` `0x4A4844` |
| **Suspended capacity** | **Does not exist.** Specified below | `CrisisDamage.suspended_civic` is the record; nothing draws it |

### The shutter plate, specified once because four briefs need it

Eras two, four, six and nine all suspend a building's capacity, and `deriveCapacities` has no
penalty term, so nothing draws it today. It is specified here so the four do not each invent one,
and it is **geometry**, because nothing tints a building at runtime.

> **The shutter plate.** A flat panel over each opening on the elevations the camera can see, in the
> era's own boarding material, standing proud of the wall. It is geometry, so the silhouette changes
> and the state survives full zoom-out.
>
> **The corner tag.** A small angled plate at the building's front lower corner carrying a
> one-glyph mark. It is the second channel, and it is what distinguishes a shuttered building from
> a building that simply has few windows.
>
> **A shuttered building is not a ruin.** A ruin has lost its silhouette; a shuttered building has
> kept it and lost its openings. The two must not converge, because one is repairable at a price and
> the other lifts on its own.

#### Corner-tag glyph ownership

The shared plate does not mean the crises share an interchangeable mark. Each glyph has one
semantic owner so a learner can recognize it without relying on colour:

| Glyph | Owner and meaning |
| --- | --- |
| One horizontal cut bar | Era six: plague quarantine closure |
| Chevron or ring | Era four: the claimant who owns or contests the site |
| Two-part diagonal trace with a central break | Era nine: the building is disconnected from the probe route |
| Cross | Shared provisional loss only; never an era identity mark |

Era nine's broken trace is deliberately neither a complete bar nor a letterform. New crisis marks
must be registered here before they enter an era renderer.

### Colour that is spoken for

`CIVIC` (green) means the learner answered correctly. `BRICK` (red) means they answered wrongly.
`SIGNAL_DEEP` (amber) is the standing mark, placed outside the correctness palette on purpose:
*"Anything that has to stay marked on the board for a reason of its own needs a third colour or it
borrows a verdict it is not making."*

**Crisis damage, threat and consequence need their own carriers.** Do not reach for red because
damage feels red. A crisis screen shows a batch verdict and a board state at the same time.

### No crisis tone here is derived from an era body hue

Deliberate, and it makes every brief survive
#296 landing or not landing. That PR is
**OPEN** and would move five era body hues:

| Era | Body hue at `952a0983` | Pending in #296 |
| --- | --- | --- |
| 2 Neolithic | `#B4714F` | `#B4917C` |
| 3 Bronze Age | `#A8824E` | `#8A6E33` |
| 4 Classical | `#C4B79A` | `#D2C8AA` |
| 5 Medieval | `#A99A85` | `#9D9C8C` |
| 6 Early Modern | `#CDBB9E` | `#E9C2A1` |
| 7 to 10 | `#8E5F4E`, `#B9B5AC`, `#96A1AB`, `#4A4E58` | unchanged |

**That table is historical and superseded, not a live palette registry.** Era six now uses
warm-buff plaster `#C7A48E` with dark slate/sheet lead `#596675`; its style guide is authoritative.

Crisis tones in these briefs are chosen against the ground and the water, which #296 does not move.

---

## Widths, and the clockless rule

### 460 and 920

`--lesson-column: 920px` is the reading column the game gives a large surface
(`apps/web/src/styles.css`, `.world-scene--large`). `460px` is the compact content cap and the width
the test suite measures at. **Every layout in these briefs is specified at both.** Several real
defects on this repo were content sized to a container that was too small.

The shared rule the nine follow: **at 920 the board and the rail sit side by side, at 460 they stack
with the board first.** The board is what the decision is made off, so it never goes below the fold.
The rail is on the right and never centred, because a centred panel covers the ground being chosen
between.

### No clocks

The crises are clockless by ruling (INV-CRISIS-1), asserted by two derived-population sweeps each
carrying a self-test that proves it can see a clock read when one is present:
`test/hardWinterClockless.test.ts` and `packages/economy/src/clockless.test.ts`.

- **Nothing may be specified that needs elapsed time to look right.** No ticking timer, no countdown
  bar keyed to seconds, no animation whose meaning depends on duration.
- **Cadence is measured in answers and turns.** "Next turn" means the next advance the player
  causes.
- **Every state must be readable in a single static frame.** The test for a proposed animation:
  screenshot it at a random moment and ask whether the board still reads.
- **Ambient motion in the renderer is fine and nothing that moves may advance the encounter.**

---

## The failure floor, which constrains the art

D-CRISIS-7: crises can damage, disable, scar or reduce capacity; they cannot undo mastery or
permanently remove an earned building. **The direct consequence for every asset in this folder:
there is no "destroyed" art.** A building a crisis wrecks becomes a **ruin**, a stage of the same
node at the same cell, and it stays a click target so its lesson is still reachable.
`engines/game/src/crisis-damage.ts` holds exactly `ruined_buildings`, `ruined_cells` and
`suspended_civic`, and states that the shape *"has no field for anything it is not"*.

An artist asked for a "destroyed building" in any brief here should read that as a ruin stage, and
the brief will say so.

---

## What the nine share, and where they deliberately differ

Written after all nine were drafted, so it records what the set actually converged on rather than
what it was told to.

### Shared, and specified once

| Thing | Where it is specified | Who uses it |
| --- | --- | --- |
| **The five card states** (idle, hover, armed, unavailable-with-reason, committed) | Each brief's section 6.3, identically | All nine. **Era eight has a sixth, `Assigned`**, because its assignments are reversible and nothing else's are |
| **Hover raises the thing on the board, and never changes colour** | Section 6.3 | All nine. It is the one interaction rule that makes a rail readable against a live island |
| **Unavailable states the reason in the card body** | Section 6.3 | All nine. Not a tooltip and not a bare dimming |
| **The 6-unit diagonal hatch for a committed or spent control** | Section 6.3 | All nine. A texture rather than a colour, so it survives the colourblind variant |
| **Provisional states frame, committed states fill** | Each brief's section 7.3 | All nine, inherited from era one's fire preview against its ward |
| **The shutter plate and corner tag for suspended capacity** | This document | Eras 2, 4, 6, 9 |
| **The solution shown on every answered question** | This document, and each brief's section 9.4 | All nine |
| **The rail at `min(430px, 42vw)`, board first at 460** | Each brief's section 5 | All nine. **Era nine states the one deliberate exception**: its evidence board is the subject and the island is the illustration |

### Deliberately different, and each difference is load-bearing

| Difference | Between | Why it must survive |
| --- | --- | --- |
| **Links in the floor against links on the floor** | 6 and 7 | The crisis spec puts both on one edge primitive and warns that era six's edges are a hazard to cut while era seven's are a supply line to keep. Inlaid band against raised steam main on sleepers is the cheapest possible separation |
| **Immediate against batched resolution** | 5 and 6 | D-CRISIS-20's third separating axis for the one adjacent pair sharing a cadence. Era five's building comes down before the fire moves; era six's infections travel at the end of a cycle |
| **Ground covered against certainty** | 2 and 9 | The two crises sharing the investigate-then-answer cadence. D-CRISIS-22 protects era nine's hedged reading, so era two's weak result is a definite answer about less ground |
| **Three ruin families** | 5, 8, 10 | Charred posts standing; slabs tilted and thin planes bent; panels off the frame with conduit hanging. Each says what happened, and a single shared ruin template would lose that |
| **A two-stage confirmation control** | 5 and 9 only | Pulling down your own building and isolating a clean one are the two irreversible destructive acts a player takes. Nothing else gets one, so the weight lands where the design wants it |

### The question every brief had to ask

**Seven of the nine ask, as their Q1, what accuracy actually sizes.** The crisis spec rules each
crisis's cadence and its stakes, and in most cases it does not say what the batch scales. Each brief
draws a reading, says why it chose that one, and puts the question to the team lead rather than
presenting the choice as settled. **They are listed together here because they are one decision made
nine times and would be cheaper to rule as a set.**

| Era | What this brief draws accuracy sizing | Section |
| --- | --- | --- |
| 2 | How much ground the search party covered | 4.2 |
| 3 | How much of a junction a gate commands | 4.2 |
| 4 | How many influence counters a batch banks. **Ruled by implication and the plainest of the nine** | 4.2 |
| 5 | How much of the building the town gets down in time | 4.2 |
| 6 | How long a closure holds | 4.2 |
| 7 | How many repairs go in the ledger. **Ruled: D-CRISIS-17 already says a finite repair budget earned from accuracy** | 4.3 |
| 8 | How many interceptors are available this turn | 4.2 |
| 9 | The quality of the reading. **Ruled at the bottom rung by D-CRISIS-22**, open at the top | 4.2 |
| 10 | How much of the grid may be reconfigured this turn | 4.1 |

### Two findings that are reported rather than resolved

Both are places where a ruled mechanic meets an inherited invariant, and neither is this folder's to
settle.

1. **Era seven: the preview invariant against the ordering axis.** INV-CRISIS-10 says a player never
   learns a cost by having paid it, and D-CRISIS-17 makes a wrong-order repair burn out. A preview
   that says *"this will burn out"* deletes the puzzle. **The brief's resolution is that the cost is
   always stated and the diagnosis is not**, and it is that brief's Q1.
2. **Era ten: "watch it simulate" against the clockless rule.** The ruled cadence ends in a
   simulation, and a simulation that plays on a timer is a clock, which two derived-population sweeps
   assert against. **The brief's resolution is a stepped resolution the player advances**, and it is
   that brief's Q2.

---

## What is not in scope

- **The ten era style guides are not edited.** Four pieces of work are live in
  `docs/superpowers/specs/eras/`. These briefs read them freely and write only here.
- **No tuning number is invented.** Section 1 of the crisis spec forbids it, and nine of the ten
  eras have no authored material denominator anyway. Numbers in these briefs are layout numbers.
- **No code is changed.** This folder is documentation only.

## Related

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: the ruled mechanics for all ten
- `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md` (on #302, open): era one
- `docs/superpowers/specs/eras/era-NN-*/style-guide.md`: each era's palette, materials, silhouette
  language and island
- `docs/superpowers/specs/eras/README.md`: the island anatomy, the six axes, the ten-era ground
  ladder
- `.cursor/skills/era-building-briefs/SKILL.md`: the conventions these briefs follow
- `apps/web/src/city/three/`: `CityLighting.tsx`, `CityScene.tsx`, `StarterIsland.tsx`,
  `WinterGround.tsx`, `winterTones.ts`, `ScarredGround.tsx`, `ruinStage.ts`, `PlacedBuilding.tsx`
- `apps/web/src/winter/`: the Hard Winter surface and the controls this folder is written against
