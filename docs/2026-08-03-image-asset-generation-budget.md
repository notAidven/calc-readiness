# The image-asset generation budget for the game lane

**Counted at `integration` `f638729f`, 2026-08-03.** Every figure below is derived from the tree —
from `ERA_SEQUENCE`, `CIVIC_CATALOGUE` and the frame inventories in the four crisis prompt sheets —
rather than estimated, except where a line says **ESTIMATE**. A finding expires when the tree moves;
re-derive before acting on this if `output/imagegen/` or `packages/skill-graph/src/eras.ts` has moved.

## The two headline numbers

| Question | Answer |
| --- | --- |
| **Image-model generations in the lane, total** | **160** |
| **Asset files that exist when it is all done** | **218** |
| Generations already done | **80 of 160 — exactly 50%** |
| Asset files already in hand | **124 of 218 — 57%** |

The two totals differ because 58 of the 218 files cost no image generation: 27 crisis reference
plates are drawn by a script, 17 era-one crisis frames are screenshots of the running game, and 14
comparison sheets are tiled from frames that already exist.

## The four categories, because they are very different work

| Category | Count when done | Exists | Owed | What it costs |
| --- | --- | --- | --- | --- |
| **Building reference plates** | 112 | 61 | 51 | One text-to-image generation each. No anchoring |
| **Crisis scene frames** | 48 | 19 | 29 | One generation each; 31 of the 48 must be image-to-image from an anchor |
| **Crisis comparison sheets** | 14 | 0 | 14 | Compositing only — tile, do not scale. No generation |
| **Crisis reference-pack plates** | 27 | 27 | 0 | Script-drawn SVG, rasterised. No generation |
| **Era-one photographed frames** | 17 | 17 | 0 | Screenshots through a browser test. No generation |
| **Total** | **218** | **124** | **94** | of which **80 are generations** and **14 are compositing** |

## Nothing shipped is an image, and that is measured

`apps/web/public` holds one folder and it is `audio`. The only texture in the renderer is a single
`CanvasTexture` drawn procedurally in code at `apps/web/src/city/three/StarterIsland.tsx:657`, for
the faint tile grid. A sweep of `apps/web/src` for `TextureLoader`, `useTexture`, `<Environment`,
`envMap` and `RGBELoader` returns that one line and nothing else.

**So every generated image in this lane is a reference plate, and none of them is a shipped asset.**
The shipped-asset path is 87 `.glb` models under `apps/web/src/city/art/models/`, loaded by
`buildingAssets.ts` and `townHall.ts` through `import.meta.glob`. A generated PNG briefs a modeller
who then authors a GLB; the PNG itself is never loaded. `crises/README.md:123-131` states the same
thing and costs any painted surface as "stand up a texture pipeline first", and
`2026-08-01-era-vehicles-and-city-life.md` §5 applies it to vehicles: they are procedural geometry,
so **no vehicle or citizen owes an image at all**.

## Building reference plates — 112, and every era already has a brief

The specified set is each era's own new skill nodes, plus the hub, plus four civic buildings. That
is the scope rule in `.cursor/skills/era-building-briefs/SKILL.md`. Skill counts are read from
`ERA_SEQUENCE` in `packages/skill-graph/src/eras.ts` and civic counts from `CIVIC_CATALOGUE` in
`packages/economy/src/civicCatalogue.ts` (40 rows, exactly four per era).

| Era | Skill | Hub | Civic | Specified | Exists | Owed | Prompts written? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Prehistoric | 6 | 1 | 4 | 11 | 10 | 1 | no jsonl; hub never briefed |
| 2 Neolithic | 5 | 1 | 4 | 10 | 10 | 0 | yes, 12 prompts (10 final + 2 superseded) |
| 3 Bronze Age | 5 | 1 | 4 | 10 | 10 | 0 | yes, 10 |
| 4 Classical | 5 | 1 | 4 | 10 | 10 | 0 | yes, 10 |
| 5 Medieval | 5 | 1 | 4 | 10 | 10 | 0 | yes, 10 |
| 6 Renaissance | 6 | 1 | 4 | 11 | 11 | 0 | yes, 11 |
| 7 Industrial | 6 | 1 | 4 | 11 | 0 | 11 | **no** |
| 8 Atomic Age | 9 | 1 | 4 | 14 | 0 | 14 | **no** |
| 9 Information Age | 6 | 1 | 4 | 11 | 0 | 11 | **no** |
| 10 Cyberpunk | 9 | 1 | 4 | 14 | 0 | 14 | **no** |
| **Total** | **62** | **10** | **40** | **112** | **61** | **51** | |

**All ten eras have a written brief.** The four owed eras have full per-building briefs in
`output/imagegen/era-{07,08,09,10}-*/README.md` — roughly 90k to 157k bytes each, with a
*Compressed, for prompting* section ready to become a jsonl. What is missing is the prompt file and
the run, not the specification.

### Where those 61 plates actually are

Only 31 are in this repository. The rest are on the lead's machine, untracked on purpose:
`output/imagegen/era-04-classical-building-briefs/README.md:1313-1315` records the convention —
*"Images are written in place beside it and are not tracked"*. Eras five and six then committed
theirs, so the convention is no longer uniform.

| Evidence tier | Buildings covered | Where |
| --- | --- | --- |
| Tracked PNGs I counted on disk | 31 | era 1 skill (6), era 2 civic renders (4), era 5 (10), era 6 (11) |
| Recorded as generated, untracked | 30 more | era 1 civic (4), era 2 briefs (6 beyond the tracked civics), era 3 (10), era 4 classical (10) |

The untracked half is **claimed but unverified** in this checkout. The claims are specific and
dated: era 3's sheet says its jsonl *"produced the ten images beside it"*, era 4's says *"every job
succeeded on the first attempt and nothing was regenerated"* with a pass verdict per image, and era
1's civic sheet says *"generated with the built-in image-generation tool"*. Two folders were
committed precisely because they are irreproducible — commit `b5f34431`, *"Back up the two image
sets no prompt file can rebuild"*.

Era 2 has been generated twice: four civic renders at 1600x1200 with no prompt file, and a later
1024x1024 run covering all ten. Both sets are on disk; the buildings are counted once.

## Crisis frames — 48, and only four eras have a crisis at all

**The mid-era crises were cut from ten to four, at eras 1, 4, 6 and 9.** That is D-CRISIS-31 as
amended by D-CRISIS-33, stated at `crises/README.md:386` and at
`2026-07-27-era-progression-design.md:2420-2435`. Eras 2, 3, 5, 7, 8 and 10 are **shelved** — their
design briefs exist in `docs/superpowers/specs/crises/` and are deliberately left carrying a known
defect *"because they cost nothing until somebody builds them"*.

| Crisis | Frames | Exists | Owed | Anchored (image-to-image) | Comparison sheets |
| --- | --- | --- | --- | --- | --- |
| 1 Hard Winter | 15 → **cancelled** | n/a | 0 | 0 | 5 → cancelled |
| 4 Succession | 19 | **19** | 0 | 14 of 19 (done) | 6 owed |
| 6 Plague | 15 | 0 | 15 | 9 of 15 | 4 owed |
| 9 Intrusion | 14 | 0 | 14 | 8 of 14 | 4 owed |
| **Total in scope** | **48** | **19** | **29** | **31 of 48; 17 still owed** | **14 owed** |

**Era one's sheet is retired, not owed.** `output/imagegen/era-01-hard-winter-fire-and-shield/README.md`
is now a failure record: four generation passes were commissioned and all four failed, and the lead
stopped them because the mechanics already render in the game. The replacement is 17 screenshots at
1024x580 in `docs/design-refs/hard-winter-crisis/`, taken through
`winterCrisisAtlas.browser.test.tsx`. **15 frames plus 5 comparison sheets were cancelled and
photographed instead, at zero generation cost.**

**Era four is complete on frames and has none of its six sheets.** All 19 frames are committed: 18
asset frames at 1248x1248 and `wide-master.png` at 1536x1024. None of `plinth-four-states.png`,
`boundary-stone-marks.png`, `drift-warning.png`, `civic-building-states.png`,
`influence-counting-board.png` or `planned-against-committed.png` exists.

**Eras six and nine have never been run.** Era four's sheet records it at owed item 8: *"era six and
era nine have never been run, so the bounding rule now written into all three sheets has been tested
on one era's frames only."* Both folders hold a README and no images.

## Per-image cost, and the part that is slower than the count suggests

**No sheet records a monetary or wall-clock cost.** Era three's is the only mention and it is
qualitative: *"Generation costs money and the current ten are correct, so add `--dry-run` unless a
regeneration has actually been decided."* What the sheets do record:

- **Building plates**: 1024x1024, `quality: high`, `use_case: stylized-concept`, gpt-image-2,
  concurrency 3. Verified across all seven committed jsonl files: **zero prompts embed an image
  reference**, so every building plate is one independent text-to-image call.
- **Crisis frames**: era four's second pass ran at **1248x1248** — chosen because the whole set must
  tile without scaling and 1254 is not a multiple of sixteen. The sheets specify a 1400 by 900 frame;
  the delivered set is square, so the sheet and the art disagree on framing while remaining
  internally tileable.
- **Anchoring is the real cost driver. 31 of the 48 crisis frames must be image-to-image from an
  anchor rather than generated independently**, because a comparison sheet claims one object in two
  states and two text prompts do not return the same object. Era four's first run proved it: three
  frames of one building came back as three different buildings, one missing the era's only
  terracotta roof. Era four's 14 anchored frames are done; **17 remain (9 in era six, 8 in era
  nine)**.
- **Measured rework overhead, on the one family that has been run**: the 19 delivered era-four
  frames took **51 committed versions** — five frames at four passes, four at three, nine at two,
  one at one. That is **2.7x, and it is a floor**, since uncommitted attempts leave no trace.

## What is genuinely unscoped

**In the current design, nothing.** This is the part most likely to be assumed wrong: the gap
between "eras that exist" and "eras with an art sheet" is **zero**. All ten eras have building
briefs, and all four in-scope crises have sheets. The remaining work is 51 building plates and 29
crisis frames against specifications that already exist, plus 14 compositing steps.

Four things are soft, and they are small:

1. **Era one's hub plate — 1 frame, ambiguous.** The brief format says a hub is *"always"* briefed,
   but era one's Town Hall was modelled before the pipeline existed (`townhall-built.glb`, committed
   2026-07-25) and no era-one hub brief was ever written. Count it as owed or as done-without-a-plate;
   the total is 112 or 111.
2. **A third claimant in era four — +1 to +3 frames, ESTIMATE.** Owed item 5: *"How many districts
   there are, and whether there are exactly two claimants … the standing/seated pair separates two by
   silhouette, where a third claimant needs a third pose."* Undecided, and it adds frames if it lands.
3. **Era two's 2026-07-30 redesign owes re-renders on 5 of its 10** — the course or brick work on the
   Potter's Kiln, Sheep Pen, Granary, Bread Oven and Village Well. The two buildings that owed a
   whole rebuild have already been re-run (`era02-neolithic-reauthor.jsonl`). This is rework at no
   change to the total, and it is marked *"PROPOSED for Evan, not decided."*
4. **Sunk work not in any total**: 16 images in the deleted `output/imagegen/d2-boomtown-square/`
   folder, a discarded direction; era one's four failed passes; era four's superseded first run.

## The one contingency that would dwarf everything — ESTIMATE

**If the six shelved crises are un-shelved, that is roughly 124 more assets.** The three live sheets
run 14 to 19 frames and 4 to 6 comparison sheets each, averaging 16 and 4.7. On the average, eras 2,
3, 5, 7, 8 and 10 would add about **96 frames and 28 sheets**, taking the generation total from 160
to roughly **256**; on the observed low and high per sheet the frame span is **84 to 114**. This is
an **ESTIMATE from the per-era spread of three sheets, not a specification** — no art sheet exists
for any of the six, and the count could move either way once one is written.

It is also **contingent on reversing a decision made twice** (D-CRISIS-31, then D-CRISIS-33) and
explicitly confirmed against the era-progression design. Treat it as a risk to name in planning,
not as owed work.

## Ranges, stated plainly

| Scope | Generations | Total asset files |
| --- | --- | --- |
| As designed today | **159 to 163** | **217 to 221** |
| If the six shelved crises return | 244 to 274 (ESTIMATE) | 326 to 368 (ESTIMATE) |

The ±2 on the firm figure is era one's hub plate and era four's possible third claimant pose.
Everything else in the 160 is a frame named in a sheet.

## Related

- `output/imagegen/era-{01..10}-*/README.md` — the ten building briefs and four crisis sheets
- `output/imagegen/era-01-hard-winter-fire-and-shield/README.md` — retired; the four measured failures
- `docs/design-refs/hard-winter-crisis/README.md` — the 17 photographed frames that replaced it
- `docs/superpowers/specs/crises/README.md:123-131` — no image textures anywhere in the city
- `docs/superpowers/specs/crises/README.md:386` — the in-scope crisis set
- `docs/superpowers/specs/2026-07-27-era-progression-design.md` §12 — the ~101 model budget, which is
  the modelling lane rather than this one
- `packages/skill-graph/src/eras.ts`, `packages/economy/src/civicCatalogue.ts` — the counts above
