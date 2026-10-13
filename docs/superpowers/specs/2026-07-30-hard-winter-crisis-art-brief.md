# The Hard Winter: design and asset brief

**Date:** 2026-07-30
**Status:** brief, for a dedicated design pass. Nothing here is built.
**Measured at:** `origin/integration` `952a0983` (the #293 merge), re-checked there after the
base moved mid-pass. Every figure below was taken off that tree, not recalled.
**Audience:** a designer or modeller who will not read the code. Everything you need is in
this document; the file paths are for whoever implements what you draw.
**Scope:** era one's mid-era crisis, as it renders on the 3D island. The copy fix described in
§7 is already done in code and needs nothing from this pass.

---

> ### AMENDMENT 2026-07-31: there are THREE option cards, not four
>
> **The mend action is gone, on the team lead's ruling** (*"also remove mend frost damage as an
> option its pointless"*). It spent a whole round undoing harm the frost had already done while
> the frost advanced anyway, and the same damage is repairable on the island afterwards for
> material, so it traded a turn for something the player could simply buy later.
>
> **What this makes stale in this brief, and it is only ever the fourth card:**
>
> - **§5.1** says *"There are four in the version PR #297 is building"* and *"One of the four
>   costs 28 cells"*. Read three, and the pull-back is one of the three.
> - **§5.2** asks for four identities and names a *"repaired mass for the mend"*. That icon is
>   not owed. Three identities: a footprint for the area answer, a single mass for the single
>   target, a contracting ring for the pull-back.
> - **§7.3** is entirely about the fourth card's copy and is now closed. Its recommended
>   reinforce string shipped; its recommended mend string has nowhere to go.
>
> Nothing else in the brief depends on the card count: §0's renderer boundary, §1-§4's ground,
> frost and building treatments, and §6's outcome panel are all untouched.
>
> **The removal was re-measured rather than assumed**, because #297 tuned the difficulty with
> four actions on the board. The recovery bill at 0, 1, 2 and 3 right answers is 390, 270, 160
> and 30 with the action and without it, identical to the digit, because a shield raised before
> a bite absorbs the bite outright and the greedy planner never declared a repair at any
> accuracy on any board. See `engines/game/src/hard-winter-difficulty.test.ts`.
>
> One consequence worth a designer's attention: **damage is now monotone inside a winter.** A
> scar on a building cannot come off until the winter ends, so §3's damaged-building treatment
> is the state a player lives with for the rest of the encounter rather than one they may undo.

---

## 0. THE HARD BOUNDARY: what this renderer cannot do

Read this section before you design anything. It is not a list of preferences. Each item is a
capability the engine does not have, so a design that depends on one cannot be built without a
renderer change, and a renderer change is a decision for the team lead (see §9).

**There are four lights in the entire scene, and they are all global.** The whole city is lit
by `apps/web/src/city/three/CityLighting.tsx`: one `hemisphereLight`, one `ambientLight`, one
shadow-casting `directionalLight` (the key) and one non-shadowing `directionalLight` (the rim).
There is no `pointLight`, no `spotLight` and no `rectAreaLight` anywhere under
`apps/web/src/`. Nothing in the world can be lit *locally*. A light belongs to the scene or it
does not exist.

**There is no post-processing of any kind.** No `EffectComposer`, no bloom, no glow, no
vignette, no colour grading pass, no depth of field. This is stronger than "none is wired up":
`@react-three/postprocessing` is not a dependency of `apps/web` at all, so adding a bloom pass
means adding a package, not flipping a flag. The only frame-level treatment is ACES filmic tone
mapping at exposure 1.0, set once on the renderer in `CityScene.tsx`.

**Emissive brightens the face it belongs to and lights nothing else.** Four places in the city
scene use it: `PlacedBuilding.tsx` lifts a GLB material's own emissive to intensity 1.2
wherever the export left one non-zero, `MasteryStars.tsx` runs 0.75 and 1.35 on the mastery
stars, `GhostBuilding.tsx` runs 0.4 on the placement ghost, and `Roads.tsx` runs 0.3 on the
road preview. (Three more sites do the same 1.2 lift on their own off-scene canvases: the shop
thumbnails, the onboarding reel and a dev model preview.) In every case the result is the same:
**that surface gets brighter and its surroundings do not change at all.** No falloff, no pool
of light on the ground, no spill onto a neighbouring wall.

**There are no image textures.** Not one. `apps/web/public` contains a single folder and it
holds audio. The entire island, all its vegetation, the shore, the sea, the roads and the
winter layer are procedural geometry with flat colours. The one texture in the whole city is a
`CanvasTexture` drawn in code to make the faint tile grid. **If you hand back a PNG, there is
nothing to plug it into.** Material colour is a hex number, per mesh.

**There is no environment map and no reflection.** Materials across the island run `metalness:
0` and roughness around 0.94. Nothing is reflective, and there is nothing for a reflective
surface to reflect.

**Shadows are one map from one direction, and they are not coloured.** The key light casts PCF
soft shadows at 2048 square over a frustum sized to the island. Shadow colour is not a
parameter that exists in this path.

**Fog is per-scene and distance-based only.** `CityScene.tsx` attaches a linear fog from
`islandRadius * 3` to `islandRadius * 20`. There is no height fog, no volumetric scattering,
and therefore no god rays and no ground-level murk that thins as it rises.

### The four consequences, stated as bluntly as they deserve

1. **A fire cannot glow.** It cannot cast light on the ground, it cannot bloom, it cannot tint
   the buildings near it, and it cannot put a warm pool under itself.
2. **Snow cannot catch a light.** No sparkle, no specular glint, no subsurface warmth where the
   sun is low behind a drift.
3. **Nothing can be lit differently from anything else.** Whatever you do to the light, you do
   to the whole island at once.
4. **A "texture" is not a deliverable.** Surface interest has to come from geometry.

### Where the brief I was given was inexact, corrected

Three corrections, none of which loosens the boundary:

- *"The only emissive path lifts a GLB material's own emissive to intensity 1.2."* There are
  **four** emissive call sites, listed above, and the highest intensity in the city is 1.35 on
  a fully-mastered star. The conclusion is unchanged, and the precedent is useful: a bright
  face at 1.35 is a thing this city already ships.
- *"Buildings render in a three-tone shading model, a flat body colour with the top face
  lightened and one side darkened."* That model is real and it is the authored art direction
  (`City_Art_Bible.md` §2, and `faceTones()` in `apps/web/src/city/palette.ts` computes it as
  `lighten(hue, 0.26)` / `hue` / `darken(hue, 0.28)`). **But no renderer calls it.**
  `faceTones` and `buildingFaces` are referenced only by their own unit test. On the 3D island
  a building's colour is baked into its GLB by the Gridwork export, and `reviveMaterial` only
  restores flat shading and the emissive lift. The practical consequence is *stronger* than the
  brief assumed: **there is no runtime path that tints a building at all today.** Frosting a
  roof means new geometry or new code, never a palette entry.
- *"Four lights for the entire scene"* is correct as written, and worth restating precisely: it
  is four lights for the **whole city**, not four per object.

---

## 0b. What IS available, which is the harder and more useful half

This is your actual toolkit. It is narrower than a modern engine's and it is not small.

**Geometry, without limit in kind.** Every visible thing on this island except the buildings is
procedural three.js geometry assembled in code: boxes, cylinders, cones, lathes, custom
buffer geometry with hand-written vertices. `StarterIsland.tsx` is 1,554 lines of it. Anything
you can describe as a shape can be built.

**Silhouette.** The camera is fixed in angle and the player zooms and pans but never rotates
the pitch. Silhouette against the sky and against the ground is the channel that survives full
zoom-out, and the folder already rules on it: era one's guide separates its hall from its
dwelling on *"one round roof against several small flat ones"*, and records that **grain
survives distance better than height does**.

**Flat colour per mesh, and vertex colour.** A mesh gets one hex. A geometry can also carry
per-vertex colours, which is how the lagoon's shallow-to-deep gradient is done today
(`buildSea` bakes a radial ramp into vertex colours). That is a real gradient tool and it costs
nothing.

**Flat shading as the house style.** `flatShading: true` on a `MeshStandardMaterial` gives every
facet its own normal, so a low-poly form reads its planes crisply under the one key light. This
is what makes the island look deliberate rather than untextured.

**Emissive as a bright face**, at up to about 1.35 without looking out of place, on the
understanding in §0.

**Animation on the frame loop.** `useFrame` is available and already used: five gulls fly
looping circuits over the sea, the mastery stars bob, buildings cross-fade between construction
stages, the placement ghost lerps its tint. **Every one of them is gated on
`prefers-reduced-motion`**, and yours must be too. See §2.6 for the one rule animation must
obey inside a crisis.

**Particle meshes.** There is no particle *system*, but there is nothing stopping a group of
several hundred small meshes (or one `InstancedMesh`) being posed on the frame loop. That is
how falling snow gets built.

**A shared ground-decal depth ladder.** Flat things laid on the ground do not z-fight, because
they are on a single uniform ladder of 0.05-unit rungs (`GROUND_DECAL_STEP`), continued through
the road stack and then through the winter layer (`winterCourseTop`). A new flat ground
treatment joins the ladder and is safe. This is the cheapest place to put new art.

**The light colours and intensities are yours.** `lightSpec()` in `CityLighting.tsx` is a
switch on a variant name, returning nine numbers: hemisphere sky colour, hemisphere ground
colour, hemisphere intensity, ambient colour, ambient intensity, key colour, key intensity, rim
colour, rim intensity. Adding a winter entry is a table row. **This is by far the
highest-leverage lever in the whole brief and it costs almost nothing.**

**The sky and the fog are yours**, from the same file: `cityEnvironment()` returns a background
colour and a fog colour, and the fog's near and far distances are set in `CityScene.tsx`.

---

## 1. What is on screen now, and what is wrong with it

### The world

Era one's island is a bright sunlit summer scene and the crisis does not change it. The ground
is dry tussock at `#A8B850`, a vivid yellow-green, over warm terracotta earth. The lagoon is
pale aqua shading to teal. Five gulls wheel overhead. The sky is `#BFE1F2`, a clear blue, and
the key light is `#FFF6E6` at intensity 1.32, which is bright warm sunlight. **A blizzard is
running and none of this moves.** That is the single largest problem and it is the one the lead
named: *"it cant just look all sunshine and rainbows when there's a whole blizzard happening."*

### The frost

Frozen ground is drawn as one full-cell box slab per frozen cell, `4 x 4` world units, in
`#DCE8F2`. Under the fixed camera a square cell reads as a diamond, which is why it looks like
scattered pale diamonds. The advancing edge (the "frost line") is a second slab on its own rung
in `#9FC0D8`. There is nothing else: no depth, no relief, no edge, no grain, no variation
between one frozen cell and the next.

What is wrong with it: **it reads as a UI highlight painted onto a summer field, not as ice on
ground.** It is one flat tone at one height with a hard cell-square boundary. Two frozen cells
side by side produce a single flat rectangle with no seam, so a field of frost has no texture
at any zoom, and the transition from frost to grass is a straight line along a cell edge.

### The fire

A fire is a 7-sided cylinder in stone grey `#6F6A63`, half a unit tall, with a 7-sided cone in
`#D4552F` standing on it. Total height is about **3 world units**, which is three quarters of
one cell width and one eighth of the tallest building the city allows. The ground a fire holds
is drawn as full-cell slabs in a warm ochre `#C98A4B`. At the middle tier the held area is a
radius-1 disc, which is exactly five cells in a plus shape, which is the orange cross on
screen.

What is wrong with it: **nothing about it is hot.** It is a small dull cone the same size as a
shrub, standing on a patch of ochre that reads as mud rather than as warmth. It does not move.
It has no smoke, so it does not read from a distance and it does not read at all when a
building stands between it and the camera. And the ochre patch shares a tone family with the
island's own bare-earth palette (`#C9A06A`, `#B2854F`), so the one thing a fire is *for* looks
like ground that has been walked on.

**A rule to know about before you design the fire:** `winterGround.test.ts` currently asserts
that every material in the winter layer has emissive exactly zero. That is a deliberate guard
("the winter reads by geometry and tone, never by light") and it is well argued for the
*ground*. It also currently forbids the one lever that could make a flame read as hot. §9
raises this as a decision.

### The option cards

Four cards in a right-hand rail, each a white rounded rectangle with a 2px translucent border,
a bold title and a 12.5px grey subtitle. The armed state changes the border to blue and adds a
12% blue wash. That is the entire visual language, and it is why the lead called the selectors
horrid: **four identical white boxes carrying four completely different kinds of decision**,
distinguished only by the words inside them.

### The forecast box

A dashed purple border around a heading reading "A fire at (1, 3) would hold:" and three rows,
each a small purple badge with a digit and a line of cell counts and percentages.

What is wrong with it is not the styling. It is that **three rows of counts is data, and the
player has a decision to make.** The player is choosing where to put a fire without knowing how
many questions they will get right. The box tells them the arithmetic of all three outcomes and
never tells them what the bet is.

---

## 2. The atmosphere direction

**The requirement:** when the crisis begins, the world turns. When it ends, the world comes
back. The player should be able to tell at a glance, from a still frame with no UI in it,
whether a winter is running.

**The constraint that shapes everything below:** you are changing a *state* of era one's island,
not re-theming it. A separate pass has just authored a per-era ground ladder for all ten eras
(`docs/superpowers/specs/eras/README.md`, and each era's `style-guide.md`), and era one's floor
in that ladder is *"packed bare earth and dry tussock, worn to soil where people walk"*.
**Nothing in this brief may change that floor.** The winter is a layer over it that is added
when the crisis starts and removed when it ends, and era one's island underneath must be
byte-identical before and after.

To keep the two specifications from colliding, the winter treatment below is written against
**the same six axes the era guides use**: Ground, Vegetation, Shoreline, Water, Signs of
habitation at the margins, and the read. Where an axis is not changed, that is said explicitly
rather than left silent.

### 2.1 The light, which is the single biggest lever

This is one table of nine numbers and it changes the entire island at once. It should be
authored first and judged in a render before anything else in this brief is drawn, because
several of the other decisions depend on how much work it turns out to do on its own.

The direction: **overcast, not night.** A blizzard at midday is bright and *shadowless*, and
that is the read to aim for. Concretely, against era one's day preset:

| Lever | Day today | Winter direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | Cold and near-white. The sun is behind cloud |
| Key intensity | 1.32 | **Down substantially.** Hard shadows are the single loudest "sunny" cue on the island |
| Key angle | Low and raking | **Lower and flatter**, or effectively overhead. A long raking shadow is a summer afternoon |
| Hemisphere sky | `#CFE6F6` | Colder and brighter. Overcast sky is a big soft source |
| Hemisphere ground | `#C08F57` warm earth | **This one matters and it is easy to miss.** The hemisphere's second colour is the light bouncing back up off the ground, so it has to be the colour the ground *is*. Under snow the bounce is cold and bright, not warm earth |
| Hemisphere intensity | 0.95 | **Up.** Under cloud, most of the light in the world is ambient |
| Ambient | `#F5EFE2` at 0.30 | Colder, and up a little |
| Rim | `#BFDCEF` at 0.48 | Keep it. Silhouette separation is more valuable in a whiteout, not less |
| Background (sky) | `#BFE1F2` clear blue | A flat pale grey-white. **No blue.** Blue sky is the thing the lead is looking at |
| Fog colour | `#D6ECF7` | The same pale grey-white as the sky, so the horizon dissolves |
| Fog near / far | `radius x 3` to `radius x 20` | **Pull both in.** This is your whiteout: the sea should fade before it reaches the edge of the frame |

Authoring note: era one's own palette work records that a light, low-chroma ground *washes out
entirely under this key light*. A white ground under a bright key is the same trap. The ground
tone and the key intensity have to be judged together, in a render, not chosen separately.

### 2.2 Ground

**A snow course laid over the ground, not a recolour of it.** The island's ground palette is a
hard-coded table inside `StarterIsland.tsx` and re-tinting it would mean threading a palette
through the island builder, which is exactly the code the per-era pass will be working in. A
decal course is additive, sits on the existing depth ladder, and lifts off cleanly when the
crisis ends.

**The catch, measured: a cell-grid decal only reaches half the island.** The crisis grid is 88
cells of 4 units each inside a radius of 22. The island's visible grass disc has a radius of
30. So the winter's cells cover **1,408 of 2,827 square units, which is 50% of the grass**. A
decal laid on the crisis cells alone leaves a green ring around the entire settlement. **The
snow course therefore needs two pieces:** the per-cell layer inside radius 22, and a **snow cap
disc** covering the rest of the grass out to radius 30 with an irregular, scalloped outer edge
so it does not read as a drawn circle.

What the snow surface should be, as geometry:

- **Not one plane at one height.** A low-relief field: gentle swells and hollows, drift ridges
  running with the island's prevailing wind (the island already has one, and every growing
  thing leans with it), and a few bare wind-scoured patches where the tussock shows through.
  The wind direction is authored in code as a vector; use it, so the drifts, the leaning
  vegetation and the falling snow all agree.
- **Drifts against every vertical.** Snow banks up on the windward side of anything standing:
  buildings, boulders, tree trunks, the town hall's ring. A short library of 3 or 4 drift
  pieces placed against verticals does more to sell snow than any amount of surface detail,
  because it is the thing that says the snow *fell* rather than being painted on.
- **Footpaths survive.** The island's worn earth and footpaths are a signature of era one
  (people have walked here and nothing else has been done to the land). Under snow they should
  read as **trodden**: a darker, compacted, slushy tone following the same routes, so the
  settlement still looks inhabited. This is one of the cheapest ways to make the winter feel
  lived through rather than applied.

### 2.3 Vegetation

Era one's plants are a few low wind-shaped trees, scrub, coarse tussock clumps and reeds in the
shallows, all leaning downwind. **Three moves, in order of value:**

1. **Snow caps.** One cap piece per plant archetype (tree crown, scrub clump, tussock clump,
   reed clump), placed as additional geometry. This is additive and does not touch the plant
   meshes.
2. **Load.** The lean already exists. Under snow the trees should sit lower and heavier. If the
   plant builder can take a scale or a lean parameter, use it before adding geometry.
3. **A bare-branch tree variant.** Optional, and a real decision: bare branches say "winter" more
   loudly than anything else in this section, and they are also more work and a different
   silhouette from the era's authored one. **Recommend: skip it for this pass.** Snow-laden
   evergreen-ish crowns get most of the read at a fraction of the cost, and the era guide's
   authored silhouette stays intact.

Do **not** add blossom, autumn colour, or anything that reads as cultivated. Era one is
pre-agricultural and its guide is explicit about it.

### 2.4 Water and shoreline

**The lagoon should freeze, and it is the single most dramatic and cheapest change available.**
The water is currently a wide pale aqua disc, radius 58, and it fills a large share of the
frame at every zoom. Turning it to ice turns the whole picture.

- **An ice sheet** over the lagoon: a disc at the waterline in a pale blue-white, with the
  cracked-plate look built as geometry (a handful of large flat polygons with visible seams
  between them, not a texture). It should not reach the far edge: **open dark water beyond the
  ice** is what makes the ice read as ice rather than as a recoloured lagoon, and it gives the
  frame a cold horizon.
- **Shore ice**: a rough, piled, broken band where the sheet meets the shelving beach. The
  shoreline is unbuilt in era one and must stay unbuilt; piled ice is weather, not construction,
  so it is safe.
- **The reeds in the shallows** should be locked into the ice rather than standing in water.

### 2.5 Signs of habitation at the margins

Era one's margins carry a hearth with fire-blackened stone, a midden, drying racks, a hide boat
pulled up above the waterline, flint chips. **These should look like a settlement bracing, not
a settlement going about its day.** Cheap, high-value additions: the boat pulled further up and
under snow; the drying racks empty; snow banked against the midden. Nothing new needs modelling
here beyond drift pieces already listed.

### 2.6 Does anything move, and the one rule it must obey

**Yes, and it should.** A still blizzard is a contradiction, and the renderer supports motion.

- **Falling snow**, as a field of small meshes drifting down and across on the island's wind
  vector. Sparse and slow. This is ambient, not a storm effect; it should never make the board
  hard to read, because the player is making a spatial decision on that board.
- **Ground spindrift**, low ribbons of snow blowing across the surface. Optional, second
  priority, and the thing most likely to become visual noise. Author it, then judge whether it
  survives.
- **The gulls should go.** Five birds wheeling in a blizzard is the loudest wrong note in the
  scene after the sky. They should be absent while a winter runs and return when it ends.

**The rule: nothing that moves may advance the encounter.** The Hard Winter is clockless by
invariant (INV-CRISIS-1): a round advances when the player acts and never otherwise, and this
is enforced by a test that sweeps the winter's engine and its playable surface for timers,
`Date.now`, `requestAnimationFrame` and `Math.random`. Ambient motion in the *renderer* is
fine, and the sweep does not currently reach the 3D winter modules (measured: the population is
10 files at this tip and does not include them). **But no visual effect may be the thing that
makes frost spread, a fire burn down, or a round end.** Every one of those happens because a
button was pressed.

And, as everywhere else in this city: **every animation is gated on
`prefers-reduced-motion`**, and under that setting it holds a posed still frame rather than
disappearing.

### 2.7 The transition, in and out

The crisis is entered from a chip on the city HUD and left with a "Leave the winter" button, so
there are two clean moments to hang the change on.

**What changes when the crisis begins:** the nine lighting numbers, the sky, the fog, the snow
course, the vegetation caps, the lagoon ice, the falling snow. The gulls leave.

**What does not change, ever:** the buildings themselves, their placement, their rotation, their
mastery stars, the roads, the island's underlying geometry, the shore profile, and era one's
authored ground palette. A player who leaves the winter must find the island exactly as they
left it. This is not only an art rule: the crisis plays over a snapshot it cannot write back to
(INV-CRISIS-13), and the only damage that persists is what the player explicitly carries back.

**How it should turn.** A hard cut is wrong in both directions. The recommendation is a short
timed cross-fade on the lighting and the fog (the same shape as the existing building-stage
cross-fade, about a third of a second), with the snow course and the ice appearing under it.
**The one thing worth spending more than that on is the entry**, because it is the moment the
crisis announces itself; the exit can be quicker.

**What the recovery looks like is a separate question this brief deliberately leaves open.** The
crisis ends with the frost thawing and giving ground back, and with ruined ground that stays
ruined. Whether the island returns to full summer instantly or through a visible thaw is a
design decision that depends on where the crisis sits in the era's flow, and it should be
answered with the era-progression pass rather than here.

### 2.8 The read, in one sentence a modeller can check against

*A summer island the weather has shut down: the same settlement, the same paths, the same boat,
under snow, with the sea frozen at its edge and the sun behind cloud.*

---

## 3. The frost

The frost is the antagonist. It has stages, it advances, and the player is making a spatial
decision about it, so it has to answer three questions at once at the fixed camera and at full
zoom-out, without a legend.

### 3.1 The three questions

1. **Which squares are frozen?** The player is choosing where a fire goes, and the fire's
   footprint is measured in cells. Cell boundaries must stay readable.
2. **Where is the edge, and which way is it moving?** The frost line is the only part that moves
   next round. It is currently a slightly different blue and it disappears into the mass behind
   it at any distance.
3. **How bad is it here?** Frost has stages, and how deep a cell is frozen is what the player is
   trading against.

### 3.2 The treatment

**Keep the cell as the unit and stop drawing it as a tile.** The read that fails today is
"scattered flat quads". The fix is not to abandon the grid, because the grid is the mechanic; it
is to make each cell a piece of a continuous *surface*.

- **Relief, not tone.** A frozen cell should be a low ice sheet with thickness, a slightly
  irregular top, and **visible edges where it meets an unfrozen neighbour**. The edge is what
  makes a field of frost read as one sheet with a boundary rather than as scattered squares. Two
  frozen cells side by side should merge; a frozen cell beside a clear one should show a lip.
- **The extent read comes from the boundary, not from the fill.** Give the *outer perimeter* of
  the frozen region a distinct treatment (a raised crest, a ridge of pushed-up rime) and the
  interior can then be quiet. This answers "which squares are frozen" better than a stronger
  fill does, and it costs less.
- **A cell's own edges stay faintly legible inside the sheet.** Not a drawn grid: a slight
  facet break at cell boundaries, so a player counting cells can count them, while the eye at
  rest reads a continuous field.

### 3.3 The stages

Three stages, and they must differ by **something other than colour**. This is not a style
preference: the crisis has a standing invariant (INV-CRISIS-16, *never hue alone*) that every
state carries at least two independent non-colour channels, and it is asserted against computed
styles in a real browser.

| Stage | What it is | The channel that is not colour |
| --- | --- | --- |
| **Rime** | The first touch. Ground still visible through it | Thin, with the ground reading through. **Coverage** is the channel |
| **Hard frost** | The cell is taken | Full coverage, low relief, smooth |
| **Deep freeze** | It has been frozen a while | **Thickness and relief.** Heaved, ridged, sitting proud of its neighbours |

**The frost line is not a stage, it is an edge.** It should be drawn as the leading crest of the
sheet: raised, directional, with the advance implied by its form. It is the thing the player
watches, and at present it is the thing that disappears first.

### 3.4 Frost on buildings

A building takes cold rounds before it becomes a ruin, and there is currently no way to see how
close one is without clicking it. **Ice climbing a building is the right signal**, and it should
read at a glance: light rime on the base, then up the walls, then the whole mass encased.

**Coordination note:** PR #297 (`cursor/hard-winter-damage-curve-5153`, open at the time of
writing) adds a `frostStage.ts` and draws frost damage on the building on the island. That PR
opens exactly this seam. **Whoever designs this should read that PR first** and design *into*
the stages it establishes rather than proposing a parallel treatment.

### 3.5 Ground given up, and the register it is drawn in

There is a fourth ground state: ground the settlement abandoned, which stays ruined and does not
come back with the thaw. It is currently a flat dead charcoal `#4A4844`. It needs to read as
**damage nobody has paid to put right** rather than as another shade of cold, and it needs to
survive being under snow, since snow will fall on it too. Recommend: keep it dark, and give it a
**texture of abandonment** (churned, broken, spoil-heaped) rather than a colour.

> #### CORRECTION 2026-08-01: this section said "permanently lost", and nothing on this board is
>
> **The sentence that was here, quoted rather than deleted:** *"It needs to read as **permanently
> lost** rather than as another shade of cold ... It is the only state on the board with no way
> back, and it should look like it."*
>
> **It has a way back and it costs 3 material a cell.**
> `HARD_WINTER.abandon.reclaim_cost_per_cell` is 3
> (`engines/game/src/hard-winter-tuning.ts:738`), and both engine files that once said otherwise
> were corrected on 2026-07-30: `hard-winter.ts:869` now reads *"the ground is scarred, it stays
> scarred until somebody pays to reclaim it"*, and the constant's own docblock records the
> contradiction and which side lost. The failure floor is the reason (team lead, 2026-07-30):
> *"Crises can damage, disable, scar, or reduce capacity, but they cannot undo mastery or
> permanently remove an earned building."*
>
> **The reading that would have saved this sentence was tested and it fails.** *"No way back"*
> could have been a claim about the PICTURE rather than about the mechanic: a permanent scar
> surviving the repurchase, so the cell comes back and the ground never quite does. **Measured,
> and it does not.** A reclaim is `clearRuinedCell` dropping the cell out of
> `crisis_damage.ruined_cells` (`engines/game/src/crisis-damage.ts:234-239`), that array is
> mapped straight to the keys the scar layer is handed
> (`apps/web/src/city/CitySurface.tsx:668-671` into `three/CityScene.tsx:1054`), and
> `buildScarredGroundGroup` draws one tile per key it is given and nothing per key it is not.
> There is no healed-scar tone, no residual decal and no third entry in `WINTER_GROUND_TONES`.
> **A reclaimed cell is the island's own ground again, indistinguishable from ground that was
> never given up.** Pinned as a measurement in
> `apps/web/src/city/three/ruinSeam.test.ts`, so a residual state added later fails there and
> brings a reader back to this note.
>
> **So the precise version, which is what a designer should draw to.** Three states, three
> different durations, and none of them is permanent:
>
> | State | How long it lasts | What that means for the drawing |
> | --- | --- | --- |
> | **Frozen** | The winter. It thaws for free when the crisis ends (`apps/web/src/winter/thaw.ts`) and is never billed | Weather. It may look total, because it is |
> | **Given up** | Until somebody pays 3 material a cell. It survives the thaw and it blocks building and roading while it stands | **Unpaid-for damage.** It has to look like something a settlement owes work on |
> | **Reclaimed** | Nothing. The cell is ordinary ground the moment it is bought back | Nothing is added. See frame 6 of the prompt sheet |
>
> **The recommendation above is unchanged and this correction is why it was right.** A texture of
> abandonment says *nobody has dealt with this*, which is exactly the durable-but-payable state.
> What the superlative invited instead was a treatment reading as **land removed from the
> island**, and that defect duly shipped and was caught by eye: at `#4A4844` against near-white
> snow the patch was at the widest contrast the scene can produce (0.835 of luminance) and the
> team lead's verdict was *"the broken ground is too dark and jarrin[g]"*. **The tone in the
> paragraph above is therefore also stale.** It is now the island's own hearth ash `#8D8A82`
> (`apps/web/src/city/three/winterTones.ts:119`,
> `three/ScarredGround.tsx:93`), and the second channel the brief asked for arrived as a
> **45-degree hatch** borrowed from the 2D board's own mark for abandoned ground
> (`SCAR_HATCH_NAME`), because after the retone the tone alone would have been colour carrying a
> state on its own, which INV-CRISIS-16 forbids.

---

## 4. The fire

The fire is the player's own mark on the board. It is the thing they placed, and it is the only
warm thing in the picture.

### 4.1 The problem, posed honestly

**A fire that reads as fire while illuminating nothing is a genuine design problem, and it is
the hardest thing in this brief.** Everything an artist reaches for first (a glow, a warm pool,
light on the nearest wall, a bloom on the flame tip) is on the forbidden list in §0. This
section is a set of the levers that remain, which between them can get most of the way.

### 4.2 The levers that remain, in order of value

1. **Smoke.** This is the biggest one and it is entirely unconstrained. A smoke column is
   geometry, it is tall, it moves, and **it is visible over the tops of buildings and from every
   pan and zoom position**. A fire that is three units tall vanishes behind anything; a smoke
   column twenty units tall never does. It should lean with the island's wind vector, the same
   one the trees lean with. **If only one thing from this section is built, build this.**
2. **Scale and silhouette.** The current hearth is three units tall. It should be a *built
   thing*: a ring of stones, a stacked cone of timber, and flame standing out of it, reading
   clearly at a cell's width. It should look like something people made in a hurry because they
   were cold.
3. **Motion.** Flame is the one shape in the world that is defined by movement. A flicker on the
   frame loop, subtle and irregular, costs one animation rig and does more than any static form
   can. Reduced-motion holds a posed flame.
4. **The melt ring, which is the fire's real footprint.** The ground a fire holds is currently a
   flat ochre patch. It should read as **thawed ground inside a snowfield**: the snow course
   *absent* over those cells, wet dark earth showing through, and a soft irregular edge where
   the melt meets the frost. This is the strongest available substitute for a pool of light,
   because it is a light-pool-shaped mark on the ground that is made of geometry.
5. **Emissive on the flame only.** A flame face at high emissive is the closest this renderer
   gets to hot. It brightens only itself, so it will not spill, but at the top of a dark smoke
   column against a white sky it will read. **This currently requires the guard in
   `winterGround.test.ts` to change**; see §9.
6. **Embers.** Small bright particles rising with the smoke. Cheap once the smoke rig exists,
   and the highest-value detail on the list.

### 4.3 The three states the fire must show

A fire has state, and all three must be distinguishable without clicking anything:

| State | What it means mechanically | What it should look like |
| --- | --- | --- |
| **Laid, never caught** | The player declared a fire and got nothing right. It is real, it is in the log, it warms nothing | A built hearth with **no flame, no smoke and no melt ring**. The absence is the point: the player should be able to see the thing they paid for doing nothing |
| **Burning** | It is holding ground, for a bounded number of rounds | Flame, smoke, embers, melt ring at its full footprint |
| **Burnt out** | Its rounds are spent and the frost has taken the ground back | Blackened stones, no flame, a thin smoke wisp or none, and the melt ring **closed over** by frost |

### 4.4 How long it has left

A fire burns for a fixed number of rounds and then goes out, and the player needs to know how
many are left while deciding whether to light another. **Recommendation: express it in the
fire's own mass**, as the fuel stack burning down, so the remaining rounds are readable from the
silhouette without a number floating over the board. If that is not legible enough at zoom-out,
the fallback is the rail, not a floating label: the crisis's accessible surface is the DOM, and
the canvas is `aria-hidden`.

### 4.5 The tier footprints

Before committing, the player sees what each accuracy tier would hold, as three nested regions
on the board. The engine's own numbers: 1 cell at the bottom tier, 5 at the middle (a plus
shape), 13 at the top (a diamond), which is 1%, 6% and 15% of the island. **The three read
apart today by shape as well as by tone, and that must survive whatever replaces them.** They
are hypotheses, so they are drawn as raised outlines rather than fills, which lets the player
see what is already frozen inside the band they are considering. That distinction is
load-bearing and must be preserved.

---

## 5. The option cards

### 5.1 What the card has to say

Every card is one action the player can commit to this round, before knowing how well they will
answer. There are four in the version PR #297 is building (three on `integration` today; the
fourth, "Mend frost damage", arrives with that PR). Each card must answer four things at a
glance:

1. **What it does**, in a phrase.
2. **What it costs**, if anything. One of the four costs 28 cells of the island permanently.
3. **What accuracy buys**, since every action's magnitude scales with the batch score.
4. **Whether it is available at all**, and if not, why.

The current card answers 1 and 2 only, in prose, in a 12.5px grey subtitle.

### 5.2 The direction

**Give the four cards four identities.** They are not four options of one kind; they are four
*kinds* of answer to the same question, and the crisis design says so explicitly (a fire is the
**area** answer, reinforcing is the **single-target** answer, pulling back is the
**all-buildings** answer, and mending is the only one that acts on the past). A card should say
which kind it is before its text is read: **an icon carrying the shape of the action** (a
footprint for the area answer, a single mass for the single target, a contracting ring for the
pull-back, a repaired mass for the mend) is the cheapest way to do that, and it is the one thing
missing that would help most.

**Separate cost from benefit, structurally.** The pull-back is the only card with a permanent
price and it currently looks exactly like the three that do not. Its cost should occupy its own
zone in the card, styled as a cost.

**Put the accuracy ladder on the card, not below it.** Today the three-rung ladder appears in a
separate list under the cards once one is armed. Three small rungs inside the card, keyed to the
same 1 / 2 / 3 badge the board uses, would let the player compare two actions without arming
either.

**Four states, all authored:**

| State | When | What it must communicate |
| --- | --- | --- |
| **Idle** | Available, not chosen | Readable, calm, not competing with the board |
| **Armed** | Chosen, now aiming | Unmistakable. The player is mid-gesture and the board is asking for a click |
| **Unavailable** | Nothing to act on (no damaged building, no ring left) | **The reason, not just a dimming.** A greyed card with no reason is the defect the current one avoids in copy and should keep |
| **Committed** | Declared, locked | The commitment is irreversible by design. It should look locked, not merely selected |

**The rail is over a live board.** Whatever the cards become, the island behind them stays
readable and the rail must not creep wider. It is currently `min(430px, 42vw)` on the right-hand
edge, deliberately not centred, because the frost advances inward from the rim and a centred
panel would cover the ground being chosen between.

---

## 6. The forecast box

### 6.1 What it is for

The player has picked a cell and has not committed. The box tells them what a fire there would
hold at each of the three accuracy tiers. **The decision it supports is not "which tier do I
want" (they do not choose that); it is "is this cell worth committing to, given that I do not
know which tier I will get".**

That reframing is the whole redesign. Three rows of counts answer a question nobody is asking.

### 6.2 The direction

**Lead with the worst case.** The player cannot choose their tier. What they can choose is a
cell whose *bad* outcome they can live with. The current box reads strongest-first, which shows
them the best case first and is precisely backwards for a bet.

**Name buildings, not cells.** The box already names which buildings each tier would reach and
buries it at the end of a sentence full of percentages. **The buildings are the stake.** Cell
counts are the mechanism.

**Make the spread visible as a spread.** The three tiers are nested regions on one board. A
small plan diagram of the three nested footprints, with the buildings each one reaches marked,
would say in one glance what three rows of prose say in three reads. The board already draws
exactly this figure; the panel is a second view of the same thing and should look like it.

**Say when the cell is a bad bet.** A fire on the shore is clipped by the water and holds fewer
cells than the tuning table's figure (the engine already computes both numbers and the copy
already mentions it in an aside). That is a *finding about the player's choice* and it should be
stated as one, not as a parenthetical.

**Keep the one sentence that is doing real work.** The box currently closes with *"You can see
the ground. You still cannot see the score, and that is the bet."* That is the clearest sentence
on the surface and it should survive the redesign.

**Drop the dashed border.** A dashed rule reads as a placeholder or a drop target. The panel is
a read-out of a real, computed forecast.

---

## 6b. The concluding screen

**A numbered section rather than a subsection of §6, and lettered rather than inserted, on this
document's own `0b` precedent.** The two are different objects: §6's forecast box is consulted
*while* deciding and belongs to a round, and this belongs to the encounter and exists only once
it has stopped. Lettered so §7 to §10 keep their numbers, because
`docs/superpowers/specs/crises/README.md`'s section map cites them by number and nine briefs
inherit that map.

**THIS SECTION IS THE CITATION SITE FOR A RULING THAT IS NOT ERA ONE'S ALONE.** The general rule
is **D-CRISIS-30** in `2026-07-29-mid-era-crisis-design.md`: *every crisis concludes, and the
screen that concludes it reports the outcome it actually reached.* It is recorded here as well as
there because the nine unbuilt crises' briefs adopt this document's structure section by section,
through a table in that folder's README with one row per section of this brief. **A new section
here is a missing row in that table**, which a rewrite has to fill or decline; a ruling in a
document those briefs merely cite can be satisfied by a sentence. §5.34 of the crisis design spec
states this reasoning from the other side and names what each of the nine owes.

> **NARROWED 2026-07-31 — there are nine briefs and only THREE of them are in scope.** The team
> lead cut the mid-era crises to four, at eras 1, 4, 6 and 9 (**D-CRISIS-31** as amended the same
> day by **D-CRISIS-33**, which moved the set from 1 / 4 / 7 / 10 to 1 / 4 / 6 / 9 — four crises
> either way), so of the nine
> briefs that inherit this document's section map, **eras 4, 6 and 9 still owe a concluding-screen
> section and the other six are SHELVED** (**D-CRISIS-32** — deferred, not cancelled, so their
> briefs and their map rows are retained and the obligation travels with them if one is picked up).
> **This sentence is the load-bearing one for
> #307**, which holds all nine briefs
> and is open: it names which three carry the obligation, and the three changed identity on
> 2026-07-31. **Eras seven and ten moved from owing it to being shelved, and eras six and nine the
> other way** — so a rewrite must not delete era seven's or era ten's brief either, for exactly the
> reason D-CRISIS-32 gives about the original six.
> **The mechanism this section relies on is unchanged**: the three in-scope briefs adopt this
> document's structure section by section, so a new section here is still a missing row in that
> README's table. **And era one's brief is still the load-bearing site for exactly the same
> reason**, which the cut strengthens rather than weakens: era one is now permanently the first
> crisis any player meets, so its structure is the one the other three copy from and the only one
> that ships today.

### 6b.1 What it is for

The lead's words: *"the final screen should be different: it should be its standalone popup that
says 'crisis complete!' along with the damage list. theres' too much like bookeeping on '88 tiles
___' it needs to just be a simple report on building status and overall accuracy. in general, all
of these crises need to have like concluding screens so that its not just anticlimatic"*.

**The decision it supports is the only one left: what do I do about this.** Everything else on
the screen is the encounter acknowledging what happened, which is a legitimate job for a screen
to have and is the *"anticlimatic"* half of the request. So the content splits cleanly:

- **The verdict and the roll are acknowledgement.** They support no decision and are the reason
  the screen exists.
- **The recovery bill and the carry-back are the decision.** They are what the player acts on.
- **Everything else is bookkeeping** and belongs to neither.

### 6b.2 What was wrong with the panel it replaces

Four things, and only the first is the lead's own wording:

1. **It reported in cells.** Its heading was *"N of M came through, on 88 of 88 cells"* and it
   carried a paragraph of frozen-cell and given-up-cell arithmetic. The frost's own share is
   explicitly not billed because it thaws, so the screen spent a whole paragraph on a number it
   then told the player to ignore.
2. **It was the surface's fourth panel, in the same rail as the first three.** The screen meaning
   *this is over* was the same object in the same place as the screen meaning *choose your next
   action*.
3. **It had no verdict.** A count in a heading is not one: *"4 of 6 came through, 2 of them
   scarred"* is the list restated, and the player still has to do the comparison themselves.
4. **It never mentioned accuracy at all**, which is half of what the lead asked a report to be
   about, and which is the one thing on the screen the player actually controlled.

### 6b.3 The direction

**Derive the verdict; never print a fixed one.** *"Crisis complete!"* over a settlement that has
just lost four buildings is worse than anticlimactic. The ruling that makes this non-negotiable
is **D-CRISIS-26**: a crisis may end unsolved with the damage standing. So the top line of the
screen is a function of the outcome, and the frame that says *the crisis is over* is a separate,
quieter element from the sentence that says *how it went*. Era one's ladder runs untouched,
held-with-scars, bought-with-ground, lost-buildings, and nothing-came-through.

**Make the shape of the outcome a picture.** One tile per building, each carrying its state as a
mark and a word as well as a tone, so *how it went* is answered by glancing at how many tiles
carry a cross. This is the damage list and the at-a-glance read in one element rather than two,
and it is what stops the list being the bookkeeping again in a new shape.

**Take the tones from the island, do not invent them.** A building's tile should wear what the
same building wears on the island: the clear-ground green for unmarked, `--hw-ruin` for a ruin,
the frost's own blue for a scar, the grey of given-up ground for ground given up. That is what
makes the screen a commentary on the picture behind it instead of a second account of it, and it
satisfies *never hue alone* (INV-CRISIS-16) for free because each tile is already carrying a mark
and a word.

**Accuracy is one sentence and it is the player's own.** *"You answered N of M right"*, over the
whole encounter rather than per round. It is not a grade and must not read as one: the crisis
writes no mastery (INV-CRISIS-7), and a percentage set in a large face beside a damage report
would look exactly like the gate the encounter is careful not to be.

**Agree with the thaw.** `apps/web/src/winter/thaw.ts` reverts the island the moment the crisis
ends and deliberately leaves the ruins and the given-up ground standing. **So the screen names
what persists and not what reverted**, and it must not cover the island it is commenting on: a
conclusion that hides the thawed city has taken away the evidence for its own headline.

**It has to fit 1024 x 580.** That is the window this is reviewed on, and the panel it replaces
overflowed it. A concluding screen is the one screen with no next action to scroll to, so nothing
on it may be below its own fold.

---

## 7. The copy, which is already fixed in code

This needed no designer and is done. Every rewrite is quoted before and after in the pull
request that carries this document. Two things are worth recording here.

### 7.1 The em-dash convention has a hole, and this copy was in it

The repository bans the em-dash (U+2014) in learner-facing strings, at the **error** tier, and
the gate runs in CI. But the check lives in
`.cursor/skills/author/scripts/validate-lesson-pack.mjs`, whose file collector accepts `*.json`
and nothing else, and CI invokes it through `scripts/check-lesson-packs.sh` over
`content/lessons/*/` and nowhere else. **So the rule has never been able to see a single string
in `apps/web/src/winter/`.** Crisis UI copy is learner-facing text that no learner-facing-text
rule has ever read.

This is the same shape of gap that was closed for lesson widgets: `scan-lesson-text.mjs` was
extended to read widget `.tsx` sources, so a claim rejected in a lesson JSON could no longer
survive reworded in the widget on the same slide.

**Measured rather than argued.** An em-dash was injected into the "Light a fire" card's copy
(`Holds the frost off a patch of ground — for 2 rounds.`), and with that defect sitting in the
file the CI gate reported **7 domains, 36 packs, 0 errors, exit 0**. It is provably blind to
this file, not merely believed to be.

**Is extending it cheap? Half of it already works, and the measurement says which half.**
Pointed at `apps/web/src/winter/`, `scan-lesson-text.mjs` finds the sources on its own and
reports *"97 prose-shaped runs across 6 widget files"*, so the collector and the prose extractor
need no work at all. **It reported clean over the same injected em-dash**, because it applies
only its rule 6 (a ban-list of rejected claims) to TSX sources and not the em-dash rule. So the
code change is one rule, applied to one more file type.

**The larger gap is not the rule, it is that the scanner is not wired into CI at all.** Only
`validate-lesson-pack.mjs` is. So "extend the scanner" and "gate crisis copy in CI" are two
pieces of work, and the second is the one that matters.

**Recommendation, sized:** extend `scan-lesson-text.mjs` to apply the em-dash rule to TSX
sources, then add a CI step covering `apps/web/src/winter/` and the three 3D winter modules. One
thing to measure before starting: the winter sources carry **35 em-dashes in
`HardWinterSurface.tsx` alone and almost all of them are in docblocks**, which are not copy. The
prose-run extractor is what has to tell those apart, and whether it does is the first thing to
check, because a rule that fires on a docblock will be turned off within a day.

### 7.2 What was fixed, and what was not

**Fixed:** every learner-visible string on the declare screen, which is the screen in the lead's
screenshot: the option cards, the accuracy ladder rungs, the fire forecast box and the pull-back
forecast box.

**NOT fixed, deliberately:** the outcome panel, the question panel, the round log, the map key
and the dev panel still carry em-dashes. They are a separate screen, they are outside what the
lead was looking at, and `apps/web/src/winter/HardWinterSurface.tsx` is contended by an open PR,
so the diff was kept to the screen under review. This is recorded as an open item rather than
left to look like an oversight.

### 7.3 The fourth card is on PR #297, not on `integration`, and it owes the same rewrite

The screen the lead is looking at has **four** cards. `integration` has three. The fourth,
**"Mend frost damage"**, arrives with PR #297, and so does that PR's rewrite of the reinforce
card, which is the line the lead quoted: *"A shield the frost spends before the building is
marked. Raised in time it leaves nothing to mend."* Neither string exists on `integration`, so
neither could be fixed here.

The reinforce line will therefore **conflict on merge**, which is the right outcome: two people
wrote that sentence and somebody has to choose. The one below is the recommendation, on the
same rule as the other three (what it does, then what it costs, in at most two short sentences,
no dash). The objection to the shipped one is that it is doing something clever and saying it
obscurely: "a shield the frost spends" asks the reader to work out that reinforcement is
consumed rather than permanent, and "leaves nothing to mend" only lands if you already know
that damage and ruin are different states.

| | Copy |
| --- | --- |
| **Reinforce, on #297** | *A shield the frost spends before the building is marked. Raised in time it leaves nothing to mend* |
| **Reinforce, recommended** | *Gives one building more cold rounds before it falls, and it lasts the rest of the winter.* |
| **Mend, on #297** | *Takes damage back off one building. {n} damaged, {m} material to mend after the winter* |
| **Mend, recommended** | *Takes the frost damage back off one building. {n} are damaged, and leaving them costs {m} material after the winter.* |

Both recommendations are copy only and need no designer. §5 owns what the cards should look
like.

### 7.4 THIS COPY DOES TUTORIAL DUTY, so a trimming pass must stop short of coverage

**ADDED 2026-07-31, and it is a constraint on work that is ongoing rather than an observation.**
The team lead cut the mid-era crises to four, at eras 1, 4, 6 and 9 (**D-CRISIS-31** as amended by
**D-CRISIS-33** in `2026-07-29-mid-era-crisis-design.md`; the set moved from 1 / 4 / 7 / 10 later
the same day and the count did not). **So the Hard Winter is permanently the first crisis any
player meets, and for a player who stops before the Classical era it is the only one.** **Both
halves of that survive the set change untouched, because era four is in both sets** — the second
crisis a player meets is the Succession Crisis either way, so the reach argument below is
unaffected. It
therefore teaches the rules §4 of that document says every crisis inherits, and **some of what
reads as boilerplate on this surface is the only statement of a rule the player is ever given.**

**Four lines in the shipped briefing (`crisisBriefingFor`, `apps/web/src/city/crisisCall.ts`) are
load-bearing in exactly that way**, and the module's own docblock already frames them as such —
the lead line is the hook and *"the slides are the manual"*:

| The line | The only statement of |
| --- | --- |
| *"Nothing runs on a timer. The winter waits until you act."* | **INV-CRISIS-1**, clocklessness, which every crisis inherits and no other surface tells the player |
| *"A building takes damage before it is ruined. It takes more than one bad round to lose it."* | the damage/ruin distinction the whole of **D-CRISIS-7**'s floor rests on |
| *"Nothing in the winter takes damage back off. A shield stops the next bite, so raise one before the frost arrives."* | the absence of an in-crisis mend, said out loud because *"a learner who expected one would keep a scarred building back waiting for it"* |
| *"Damage left at the end of the winter can be repaired on the island. Repairs cost material."* | **D-CRISIS-7**'s *you survive, but the city carries the consequences*, in the player's own units |

**The rule: trim for register, never for coverage.** A pass may shorten a sentence, cut a clause
that repeats itself, or move a line to a better slide — §7.2 above is exactly that kind of work and
none of it is discouraged. **What it may not do is remove the LAST statement of an inherited
rule**, because after D-CRISIS-31 there is no second crisis early enough to restate it and no other
surface that does. §7.1's recommendation to gate this copy in CI is unaffected and, if anything,
better justified: an em-dash rule that can finally read these strings will be reading the game's
only crisis tutorial.

---

## 8. The consolidated asset list

**33 items.** Grouped by area, each one a thing to produce. "Treatment" means a specification
plus tuned numbers rather than a mesh.

### Atmosphere (9)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Winter lighting preset: nine numbers (key, hemisphere x3, ambient x2, rim x2, and the key's angle) | Treatment |
| A2 | Winter sky and fog preset: background colour, fog colour, fog near and far | Treatment |
| A3 | Snow ground course, per cell, for the 88 cells inside radius 22 | Model, tiling set |
| A4 | Snow cap disc for the outer grass ring, radius 22 to 30, with an irregular outer edge | Model |
| A5 | Drift pieces to bank against verticals, 3 to 4 variants | Models |
| A6 | Trodden-path treatment: the island's worn routes, compacted, under snow | Treatment |
| A7 | Vegetation snow caps: one per archetype (tree crown, scrub, tussock, reed) | Models x4 |
| A8 | Lagoon ice sheet, with cracked-plate seams and open water beyond it, plus a shore-ice band | Models |
| A9 | Falling snow field, and the decision on ground spindrift | Model + animation rig |

### The frost (7)

| # | Item | Kind |
| --- | --- | --- |
| F1 | Frost sheet, stage 1 (rime): partial coverage, ground reading through | Model |
| F2 | Frost sheet, stage 2 (hard frost): full coverage, low relief | Model |
| F3 | Frost sheet, stage 3 (deep freeze): thickness, heave, ridging | Model |
| F4 | Sheet edge pieces: the lip where a frozen cell meets a clear one | Models |
| F5 | Frost line crest: the advancing edge, directional | Model |
| F6 | Frost-on-building stages (design **into** PR #297's `frostStage.ts`) | Models / treatment |
| F7 | Ground given up for good: churned, broken, permanently lost, and it holds up under snow | Model |

### The fire (7)

| # | Item | Kind |
| --- | --- | --- |
| R1 | Hearth model: stone ring and fuel stack, at a scale that reads at a cell's width | Model |
| R2 | Flame geometry plus its flicker rig, and a posed reduced-motion still | Model + animation rig |
| R3 | Smoke column, leaning on the island's wind vector. **Highest value single item in this list** | Model + animation rig |
| R4 | Embers | Model + animation rig |
| R5 | Melt ring: thawed ground inside the snowfield, with a soft irregular edge | Model / treatment |
| R6 | Burnt-out state: blackened stones, melt ring closing over | Model |
| R7 | Fuel-remaining read: how many rounds a fire has left, expressed in its own mass | Treatment |

### The UI (10)

| # | Item | Kind |
| --- | --- | --- |
| U1 | Option card design | Design |
| U2 | Option card state set: idle, armed, unavailable-with-reason, committed | Design |
| U3 | Action icons, one per action (area, single target, pull-back, mend) | Icons x4 |
| U4 | Accuracy-ladder rung component, keyed to the board's 1 / 2 / 3 badge | Design |
| U5 | Cost zone treatment, for the one action that has a permanent price | Design |
| U6 | Forecast panel: worst case first, buildings named, spread visible | Design |
| U7 | Nested-footprint plan diagram for the forecast panel | Design |
| U8 | Rail chrome: frame, header, round counter, exit control | Design |
| U9 | Refusal and error treatment ("nothing was spent, choose again") | Design |
| U10 | The crisis's entry and exit moments, as a designed transition | Design |

**Counts by kind:** 17 models or model sets, 4 icons, 5 animation rigs (some shared with a
model row), and 10 UI designs. **Two items carry most of the read and should be built first:
A1 (the lighting preset) and R3 (the smoke column).** A1 changes the entire picture for the cost
of a table row, and R3 is the only lever that makes a fire visible from anywhere on the board.

---

## 9. Desirable, and genuinely unbuildable under the current renderer

Each of these would improve the crisis and **none of them can be built without a renderer
change.** They are listed so the lead can decide whether the renderer should change, rather than
being quietly dropped or quietly attempted.

1. **A fire that lights its surroundings.** A warm pool on the snow, light on the nearest wall,
   a falloff. Needs a `pointLight`, which means a fifth light in a rig that has four, and if it
   is to cast shadows it means a second shadow map. **This is the biggest single visual gap
   between what the crisis wants and what it can have.**
2. **Bloom on the flame and on ice.** Needs `@react-three/postprocessing` added as a dependency
   and an `EffectComposer` on a canvas that currently sets its tone mapping directly. Not
   expensive in itself; it is a rendering-architecture decision, and it would affect every
   surface in the game, not just the crisis.
3. **Emissive anywhere in the winter layer.** Blocked today not by the renderer but by a guard:
   `winterGround.test.ts` asserts emissive is exactly zero on every winter material, with a
   floor of 20 materials under the sweep so it is not passing vacuously. **The guard is right
   about the ground and wrong about the flame**, and the two are in one layer. Loosening it owes
   a demonstration that it still catches what it was written for: the way to do that is to
   permit emissive on the fire's flame mesh alone, then inject an emissive *ground* tile and
   watch the loosened assertion fail. Until that is done, the flame is non-emissive.
4. **Frost tinting the buildings it climbs.** A building's colour is baked into its GLB and no
   runtime path tints one. Doable, but it is code (walk the material graph the way
   `reviveMaterial` already does), not an asset, and it would need to be undone exactly on
   thaw.
5. **Volumetric blizzard haze, god rays, or ground murk.** Fog is linear and distance-based
   only. There is no height fog and no scattering. A whiteout that thickens toward the ground
   cannot be drawn.
6. **Wet ice with reflections.** No environment map, nothing to reflect, and `metalness: 0`
   across the island by convention. Ice can be pale and faceted; it cannot be glassy.
7. **Snow accumulating progressively on the existing building GLBs.** There is no decal
   projection path. Snow on a roof means per-building geometry (18 built models today, and
   growing with every era) or a code change.
8. **Any image texture at all**, for snow grain, ice cracks, or anything else. There is no
   texture pipeline; the one texture in the city is drawn procedurally onto a canvas.

---

## 10. References

- `apps/web/src/city/three/CityLighting.tsx` : the four-light rig, `lightSpec()` and
  `cityEnvironment()`.
- `apps/web/src/city/three/CityScene.tsx` : tone mapping, background, fog, and the scene graph.
- `apps/web/src/city/three/StarterIsland.tsx` : era one's island, its palette table `C`, the
  wind vector, the shore profile, the lagoon, and the gulls.
- `apps/web/src/city/three/WinterGround.tsx` : the winter ground layer as it is today, the depth
  ladder it sits on, and the fire.
- `apps/web/src/city/three/winterTones.ts` : every tone the winter draws.
- `apps/web/src/city/three/WinterInCity.tsx` and `winter-in-city.css` : the rail over the island.
- `apps/web/src/winter/HardWinterSurface.tsx` and `hard-winter.css` : the panels and their copy.
- `engines/game/src/hard-winter-tuning.ts` : rounds, batch size, frost schedule, fire radii and
  burn rounds, cold rounds to ruin, and the reclaim price.
- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md` **D-CRISIS-31, D-CRISIS-32 and
  D-CRISIS-33** : the 2026-07-31 scope ruling — **four crises, at eras 1, 4, 6 and 9** (D-CRISIS-31
  set them at 1 / 4 / 7 / 10 and **D-CRISIS-33 moved the set the same day**, keeping the count),
  with the other six
  shelved rather than cancelled, and every era keeping its end-of-era progression. **It is why
  §7.4 exists** (era one is permanently the first crisis a player meets, so its briefing does
  tutorial duty) and why §6b's nine inheriting briefs are three in scope and six deferred.
  **§5.37 there is §7.4's other half**, and **§5.41 there is the sweep that corrected §6b and §7.4
  of this document for the new set**
- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md` : the crisis invariants,
  including INV-CRISIS-1 (clockless), INV-CRISIS-10 (everything provisional is previewed) and
  INV-CRISIS-16 (never hue alone). **D-CRISIS-30 and §5.32 to §5.34 are what §6b of this
  document is era one's instance of**, and D-CRISIS-26 is the ruling that forbids a fixed
  celebratory verdict.
- `apps/web/src/winter/thaw.ts` : what the island reverts to when the crisis ends, and what it
  deliberately keeps. §6b's fourth clause is a requirement to agree with this file.
- `docs/superpowers/specs/eras/README.md` : the island anatomy, the six axes, and the ten-era
  ground ladder this brief must not collide with.
- `docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` : era one's island, and the
  note recording that its ground is the ladder's floor and is deliberately not re-specified.
- `docs/superpowers/specs/City_Art_Bible.md` §2 : the three-tone face model and *"no runtime
  lights"*.
- `docs/superpowers/specs/eras/era-10-cyberpunk/style-guide.md` : the same renderer boundary,
  stated for the one era that leans hardest on light.
