# The asset pipeline, end to end

**Measured at `bf7acc60` (`origin/integration`), 2026-08-03.** Every link below was checked by
reading the code or the tree, not by reading a document about it. Where a claim rests on prose
rather than on a file, it is marked **UNVERIFIED** in place rather than smoothed over.

**Read the dates.** A finding is evidence about a SHA, not about the repository
(`.cursor/rules/qa-verification.mdc`). The file:line citations here are the first thing a merge
in these areas invalidates. Re-take them at the tip before acting on any of them.

---

## The short answer

There are **three** asset paths, and they end in three different places.

| | Input artefact | Final artefact | Where it lives | Reaches the running app? |
| --- | --- | --- | --- | --- |
| **A. Buildings** | The era's `style-guide.md` + `civic-buildings.md` | `.glb` | `apps/web/src/city/art/models/` | **Yes**, bundled by Vite |
| **B. Crisis mechanics** | The crisis design spec | Hand-written TypeScript geometry (`.ts`, `.tsx`) | `apps/web/src/city/three/` | **Yes**, as code |
| **C. Characters and advisors** | A Claude Design `.dc.html` | A `.tsx` React component drawing DOM boxes or SVG | `apps/web/src/lessons/*Character.tsx` | **Yes**, as DOM |

**No generated raster image is ever loaded at runtime, on any of the three.** That is the one
property the whole pipeline shares, and it is asserted from four directions:

- `apps/web/public` holds exactly one directory and it is `audio` (two `.mp3`, five `.ogg`, one
  `CREDITS.md`).
- The only texture constructed anywhere in `apps/web/src` is one procedural
  `THREE.CanvasTexture` at `apps/web/src/city/three/StarterIsland.tsx:657`, built by `buildGrid`
  from a `<canvas>` the function draws the placement grid onto. No image file is involved.
- A sweep of `apps/web/src/**/*.{ts,tsx}` for `TextureLoader`, `useTexture`, `<Environment`,
  `envMap`, `RGBELoader`, `CanvasTexture`, `CubeTextureLoader` and `useEnvironment` returns
  exactly two hits: the `CanvasTexture` above, and the string `"envMap"` inside
  `apps/web/src/city/three/winterScene.test.ts:142`, which is a **prohibition** — that test
  walks every winter asset's materials and asserts `map`, `normalMap`, `roughnessMap`, `envMap`
  and `aoMap` are all falsy.
- Every `.png` string in `apps/web/src` is a screenshot *output* path in a browser test, never
  an import.

So generated art in this repository is **reference material for a human**, never a shipped
asset. `docs/design-refs/hard-winter-crisis/README.md` states the same rule from the other
side: *"nothing under `docs/design-refs/` is reachable from the app, the city renderer loads no
image texture at all, and that should stay true."*

---

## Path A — buildings become 3D

### The chain, as the tree actually has it

```
era style-guide.md + civic-buildings.md          docs/superpowers/specs/eras/era-NN-*/
        │  (the era-building-briefs skill)
        ▼
building brief README.md                         output/imagegen/era-NN-*-building-briefs/
        │  ("Compressed, for prompting" section)
        ▼
.jsonl run sheet                                 same directory, committed
        │  (Codex imagegen CLI, gpt-image-2)
        ▼
PNG reference plates                             same directory, tracked for some eras
        │  ~~~ THE GAP ~~~  a person reads the plates and the brief
        ▼
procedural three.js art, delivered as .dc.html   apps/web/src/city/art/building-sources/
        │  (a committed Node exporter, seeded)
        ▼
.glb                                             apps/web/src/city/art/models/
        │  (import.meta.glob, eager, ?url)
        ▼
the running city                                 four registries, listed below
```

### Correction 1 — "a modeller builds a `.glb`" is not what happens for most of the tree

**Nobody hand-models these.** Evan delivers **procedural three.js art** as a self-unpacking
`.dc.html` bundle, and a **committed Node exporter** evaluates it and writes the GLBs. The art
is code, so the GLBs are reproducible and diffable rather than opaque binaries.

| Source (`art/building-sources/`) | Exporter | Emits | Committed |
| --- | --- | --- | --- |
| `civic-era-01-all-stages.dc.html` | `scripts/export-civic-models.mjs` | 12 | **4** (`built` only) |
| `era-02-neolithic-all-buildings.dc.html` | `scripts/export-era-two-civic-models.mjs` | 15 | **5** (4 civic + hub, `built` only) |
| `era-02-neolithic-all-buildings.dc.html` | `scripts/export-era2-skill-models.mjs` | 15 | **15** (all three stages) |
| `era-03-bronze-age-all-buildings.dc.html` | `scripts/export-era3-building-models.mjs` | 30 | **20** (15 skill stages + 4 civic + hub) |

One source file feeds two exporters for era two, deliberately — *"a shared script is a shared
merge conflict on every run"* (`export-era-two-civic-models.mjs` header).

Each exporter seeds `Math.random` per output basename (era one's builders call it in 76 places),
offers `--check` to prove the tree's bytes are reproducible, and pins SHA-256 digests for the
stages it emits but does not commit. `--check --no-seed` is what makes a green `--check` mean
something: era one reports all twelve differing, era two's skill lane reports 13 of 15.

**43 of the 87 GLBs have no committed source.** Era one's 18 skill models and its 3 hub models
arrived as binaries in `bf0e61fe` (*"extract Gridwork buildings to GLB + R3F geometry proof (3D
pivot phase 1)"*, 2026-07-21) and were replaced in place by `be9f00b6` (*"Era one's 21 building
GLBs regenerated 18% lighter, and adopted"*, 2026-07-28); the 21 preserved `gridwork-modern/`
files and the one road kit sample likewise. **Where those were regenerated from is UNVERIFIED**
— there is no `num-*` output in any committed exporter, and no `.dc.html` for them.

### Correction 2 — there are four runtime GLB registries, not two

`import.meta.glob` over `.glb` appears at five sites, four of them production:

| Registry | Glob | Bundles |
| --- | --- | --- |
| `city/buildingAssets.ts:367` | `./art/models/*.glb` **minus** `civic-*.glb` | 48 skill models (18 + 15 + 15) |
| `city/civicBuildings.ts:326` | `./art/models/civic-*.glb` | 12 civic `built` models |
| `city/townHall.ts:229` | `./art/models/townhall/*.glb` | 5 hub models |
| `city/roadModels.ts:24` | `./art/models/roads/*.glb` | 1 road kit sample (registered, not rendered) |
| `city/three/GridworkModelPreview.tsx:50,57` | the flat dir and `townhall/` | dev bench only (`?three`) |

**Every one of them is non-recursive, and that is load-bearing.** `buildingAssets.ts`'s docblock
measured what happens if the skill glob is made recursive — the figures are its own, taken
before eras two and three added their GLBs, and the shape of the hazard is what carries forward.
43 files matched but collapsed to 22 basename keys, because `gridwork-modern/num-2-built.glb`
collides with `num-2-built.glb`. The count guard moved 18 → 22 and went red, but the +4 was
`townhall/` and `roads/`: **the preserved set is invisible to any count**, and which file a
basename resolves to would be decided purely by glob key order. `gridwork-modern/` happens to
sort before `num-*` so the live entry is written last and wins, which is luck rather than a
design.

`buildingAssets.test.ts:181` pins the skill set at 48 and, at `:183`, asserts its **composition**
as well as its size, because 48 is satisfied by era one's eighteen plus thirty of anything.

### The GLB inventory, counted at this tip

87 `.glb` files, all tracked, none in `apps/web/public`:

| Set | Files | Bundled by |
| --- | --- | --- |
| Era one skill (`num-*`, 6 nodes × 3 stages) | 18 | `buildingAssets.ts` |
| Era two skill (`exp-1-*`, `rad-1..4-*`) | 15 | `buildingAssets.ts` |
| Era three skill (`lin-1,3,4,5,6-*`) | 15 | `buildingAssets.ts` |
| Civic `built` (era one 4, era two 4, era three 4) | 12 | `civicBuildings.ts` |
| Hub (`townhall/`: era one's 3 stages, `-neolithic-built`, `-bronze-age-built`) | 5 | `townHall.ts` |
| Roads (`roads/road-straight-rounded.glb`) | 1 | `roadModels.ts` |
| Preserved and deliberately unwired (`gridwork-modern/`, incl. its `townhall/`) | 21 | **nothing** |

### The naming key, which is what makes the flat directory safe

A skill GLB's basename is derived from the **node id**: `nodeFilePrefix` lowercases it and turns
`.` into `-`, so `NUM.S` → `num-s-built.glb`. Node ids are the registry's primary key, so the
derived prefixes are collision-free by construction rather than by convention —
`buildingAssets.test.ts:69` asserts the derived set is as large as the node set rather than
assuming it. Civic files key on the catalogue id (`<era>_<slug>` →
`civic-neolithic-granary-built.glb`), with era one's four unprefixed for historical reasons. The
hub is a sentinel with no type id and is named explicitly in `townHall.ts`.

`resolveBuildingModel` **fails closed** rather than returning `null`: a node with no GLB gets the
shared neutral procedural template for that phase. The docblock records why — the roster stopped
being six, 56 nodes became placeable with no model, and `null` would have produced an invisible
building *and* an unreachable lesson, because on the canvas the pointer hits geometry and a
`<group>` with no mesh is not a raycast target.

### What is committed on the generation side, and what is not

Run sheets are committed; era three's brief states the reason — *"it is the only thing this art
can be regenerated from."* Ten sheets are tracked at this tip (seven building sheets across eras
2-6, three crisis-scene sheets in era 4), and this change adds four more for eras 7-10.

**Generated plates: the picture has changed and the design docs have not caught up.**
`2026-07-30-era-palette-ladder.md:96-97` says *"the tracked `output/imagegen/era-*/` folders hold
briefs, not images"*, and `2026-08-01-era-and-crisis-music-brief.md:66` says *"All ten
`output/imagegen/era-*/` folders hold exactly one file, `README.md`."* Neither is true at this
tip: **51 PNGs are tracked under `output/imagegen/`** — era 5's ten buildings (10), era 6's
eleven (11), the era-4 succession crisis scenes (20), plus
`era-01-prehistoric-skill-buildings/` (6) and
`era-02-neolithic-civic-renders/` (4). Those last two folders carry no `README.md`, so **whether
they are generated plates or renders of the shipped GLBs is UNVERIFIED**; the folder name says
*renders*. Eras 3 and 4's *building* plates are in neither the index nor the working tree, so
era three's *"the ten images beside it"* does not describe this checkout either.

### Generation parameters, from the sheets themselves

Verified against all seven committed building sheets: five keys per line — `out`, `size`,
`quality`, `use_case`, `prompt` — with `size: "1024x1024"`, `quality: "high"`,
`use_case: "stylized-concept"`. No key on any line carries an image reference, so every plate is
an independent text-to-image call. The model (`gpt-image-2`) and the concurrency (3) are not in
the sheets; they are recorded in prose at
`output/imagegen/era-04-classical-building-briefs/README.md:1315-1316` and in the
`generate-batch` command at
`output/imagegen/era-03-bronze-age-building-briefs/README.md:1350-1355`, which is also where the
`--dry-run` convention lives: *"Generation costs money … so add `--dry-run` unless a
regeneration has actually been decided."*

The era-4 crisis sheets are the exception in every respect — three keys (`out`, `prompt`,
`size`), `1248x1248` and `1254x1254`, and absolute Windows paths in `out`. Do not copy them.

### The gap in the middle, stated plainly

**Nothing in the tree connects a generated plate to the `.dc.html` that follows it.** No
exporter reads `output/imagegen/`, no build step consumes a plate, and no source file references
one except as prose. That the plates informed Evan's delivery is a workflow fact about people,
not a fact I can verify from code — **UNVERIFIED**, and the honest reading of Path A is that it
has a human in the middle by design.

---

## Path B — crisis mechanics become procedural code

### The chain

```
crisis design spec                docs/superpowers/specs/crises/, crisis-reference-packs/
        │
        ▼
tools/generate-winter-crisis-references.ps1
        │  (draws SVG from shared primitives; rasterises PNG)
        ▼
reference plates, SVG + PNG       docs/superpowers/specs/crisis-reference-packs/<crisis>/
        │  ~~~ a developer reads the plate ~~~
        ▼
hand-written three.js geometry    apps/web/src/city/three/
        │  (rendered live, every winter)
        ▼
browser screenshot tests          docs/design-refs/hard-winter-crisis/ etc., committed PNGs
```

### Confirmed: no runtime asset is produced anywhere on this path

`winterFire.ts`, `winterShield.ts`, `frostStage.ts`, `winterTones.ts` and
`CrisisStatusMarker.tsx` contain no `import.meta.glob`, no `.glb`, no `useGLTF`, no texture
constructor and no `fetch`. They import `three` and `@cr/game` and build geometry. The single
grep hit across the five is the word "banded" inside a comment in `frostStage.ts:101`.

**One correction to the phrasing.** The path does produce *files* — 27 SVG plates and 27 PNGs
across four packs, plus committed screenshot frames. What it never produces is an artefact the
**app** loads. Both halves are worth keeping: the plates are the design record, and the app's
copy of the mechanic is code.

### Correction 3 — the PowerShell script draws all four packs, not some of them

`tools/generate-winter-crisis-references.ps1` takes `-Pack all|hard-winter|succession|plague|
intrusion`. Its header states why one script rather than four: *"ground, camera, shadow
direction and the three-tone face model are properties of the RENDERER, not of a crisis, and
three separate scripts would have drifted on all four within a week."* Era one's output is
byte-identical to what it was before the parameterisation, asserted by regenerating over the
committed files and diffing.

The SVG is the source of truth and the PNG is a convenience: `index.html` loads the SVG. The
PNG pass uses `System.Drawing`, which is Windows-only from .NET 6, and warns and skips elsewhere
with `tools/rasterise-crisis-references.mjs` (Playwright Chromium) named as the fallback. The
two rasterisers disagree wherever a `<polygon>` carries a stroke — era one's
`05-fire-smoke-column.png` is the measured instance.

**The separately *generated* crisis art is a different lane.** `output/imagegen/
era-04-succession-crisis-scenes/` holds 20 generated PNGs and three run sheets; eras 6 and 9's
crisis-scene folders hold a `README.md` and nothing else. So both descriptions are right about
different crises: eras 1, 4, 6 and 9 all have a **drawn** pack under `docs/`, and era 4 alone
has **generated** scenes under `output/`.

### Era one's crisis sheet: retired, and the reason is the one given

`output/imagegen/era-01-hard-winter-fire-and-shield/README.md:8` — restructured 2026-08-01 at
`50a917fa` after a Codex pass returned five unusable images, and **retired 2026-08-02 at
`0cb08e7e`**. The banner at `:12` gives the reason: *"Era one's mechanics all render in the
game, so they are being photographed directly rather than imagined."*
`docs/design-refs/hard-winter-crisis/README.md` names the ten shipped modules that made a
generator the wrong instrument: `winterFire.ts`, `winterFireGhost.ts`, `winterShield.ts`,
`CrisisStatusMarker.tsx`, `frostStage.ts`, `ruinStage.ts`, `ScarredGround.tsx`,
`BuildingFrostCrust.tsx`, `winterFrostFront.ts` and `WinterGround.tsx`.

Four passes were run and each failed differently; the failure record is kept in full and is
explicitly *"the evidence the three crisis-sheet rewrites of 2026-08-02 are founded on."* The
count itself carries a caveat the file states: the tree evidences three passes in detail and the
commissioning brief counts four, the difference being whether the two-frame pilot is counted
apart from its corrective round.

### Verification is a committed screenshot at 1024x580

`apps/web/src/city/three/winterCrisisAtlas.browser.test.tsx:126` writes 17 frames into
`docs/design-refs/hard-winter-crisis/`, every one 1024x580 with the size in the filename. Its
README cites `.cursor/rules/qa-verification.mdc` for why: *"a spatial claim owes a rendered
frame somebody looked at, taken at a short, realistic viewport and named beside it."* The PNG's
own IHDR is read back in the run that wrote it, so a scaled capture cannot pass for the viewport
it claims.

**Note the split.** `winterCrisisShots.browser.test.tsx:499` writes to `__screenshots__/`, which
`.gitignore` excludes; the *committed* atlas is a different harness. Frames land in `docs/` when
a review needs to open them, following the precedent `docs/design-refs/crisis-panel-width/` set.

---

## Path C — characters and advisors

**This is the part the lead was least sure of, so it is answered in full.**

### The chain

```
era style-guide.md's advisor section         docs/superpowers/specs/eras/era-NN-*/
        │
        ▼
Claude Design / Gridwork export, .dc.html    apps/web/src/city/art/sources/
        │  ~~~ A MANUAL PORT. There is no script. ~~~
        ▼
<Name>Character.tsx                          apps/web/src/lessons/
        │  + a CSS block (styles.css, or makaAdvisor.css)
        ▼
four DOM surfaces                            AdvisorNpc, CrisisCallAdvisor,
                                             EraAdvanceCeremony, DemoReel
```

Nothing on this path is ever a `.glb`, and no step of it enters the R3F scene graph.

### The answer

**Characters are 2D and buildings are 3D.** An advisor is a React component that returns
absolutely-positioned `<div>`s (Oru, Maka) or one inline `<svg>` (CityGuide), styled by CSS and
animated by CSS keyframes, mounted in DOM surfaces that sit outside the `<Canvas>`.

**But "does anything from Claude Design ever become 3D?" is YES — for buildings.** The two
questions come apart because there are **two** `.dc.html` directories with two different fates,
and only one of them holds characters:

| Directory | Holds | Becomes | How |
| --- | --- | --- | --- |
| `apps/web/src/city/art/sources/` | 3 advisor characters | `.tsx` React components | **A manual port.** No script. |
| `apps/web/src/city/art/building-sources/` | 3 building bundles | `.glb` 3D models | **Four committed Node exporters.** |

So a `.dc.html` is a delivery format, not a medium. What it contains decides where it goes: an
advisor source is percentage-boxed HTML, and a building source is a gzip-compressed JavaScript
manifest that procedurally builds `THREE.Group`s. `era-03-bronze-age-all-buildings.dc.html`'s
entry in `art/building-sources/README.md` says so in terms — *"It contains no PNG, SVG, GLB or
linked sibling asset directory. The reusable art is one gzip-compressed JavaScript manifest
entry defining `window.Era3Kit`."*

### The advisor shelf, and its three files

The brief saw two. There are three — `MakaAdvisor.dc.html` landed 2026-07-31 (`f4b30b6f`).

| Source | Component | Medium | Status |
| --- | --- | --- | --- |
| `OruAdvisor.dc.html` | `lessons/OruAdvisorCharacter.tsx` | 13 nested `<div>`, no `<svg>` | **LIVE** — era one, and the one character the run has |
| `MakaAdvisor.dc.html` | `lessons/MakaAdvisorCharacter.tsx` | 65 `<div>`, no `<svg>` | **LIVE** — era two's costume, ported 2026-07-31 |
| `CityGuide.dc.html` | `lessons/CityGuideCharacter.tsx` | one `<svg viewBox="0 0 240 240">`, 5 `<path>` | **PRESERVED, deliberately unwired** — a later era's art |

The source shape is visible in the first 40 lines of `OruAdvisor.dc.html`: a
`position:relative; aspect-ratio:1/1` container full of `.or-a { position: absolute }` boxes
with percentage `left`/`top`/`width`/`height`, `border-radius` doing the shape work, and
`@keyframes oru-bob`, `oru-blink`, `oru-sway`, `oru-point`, `oru-talk`, `oru-float` and
`oru-thatch` for motion. The port keeps that shape, which is why the character scales with
whatever square its host gives it.

### What consumes a `.dc.html` on this path: a person, and then two tests

**There is no conversion step.** The port is manual, and the source is kept verbatim so the port
can be checked against it rather than trusted (`art/sources/README.md`). `OruAdvisorCharacter.tsx`
has **zero imports** — asserted by its own test, because an inline style or a module of its own
is how the `prefers-reduced-motion` gate gets escaped. `MakaAdvisorCharacter.tsx` imports one
stylesheet and nothing else.

The two guards that stand in for the missing consumer of the unwired one:

- `lessons/cityGuidePreserved.test.tsx:140` globs `../city/art/sources/*.dc.html` and asserts
  **set equality both ways** against a named census of three, with a floor of 3 under it so the
  equality is not two empty lists agreeing. It also pairs each source with a component that
  exists, and asserts each source is still a real drawing rather than a stub — CityGuide must
  still contain `viewBox="0 0 240 240"` and `cg-wave`, and each advisor must still offer `idle`,
  `talk`, `point` and `squint`.
- `lessons/cityGuidePreserved.browser.test.tsx` drives real Chromium against the real stylesheet.

**One stale docblock, reported not fixed.** `buildingAssets.ts:357-359` still says `art/sources/`
is *"PINNED to exactly two files … `CityGuide.dc.html` + `OruAdvisor.dc.html`"*, and
`art/building-sources/README.md:219-226` repeats it. The census was widened to three on
2026-07-31 and `art/sources/README.md` records the widening as deliberate: *"A genuine third
advisor belongs on the advisor shelf; hiding the file in a subdirectory to slip past the glob
would leave the shelf's own inventory assertion measuring two of three files."*

### Where the advisor is drawn, and why it cannot be inside the canvas

Four surfaces mount an advisor character, all DOM:

- `lessons/AdvisorNpc.tsx:45,50` — lesson narration, dispatching on the era's `art` token
- `city/CrisisCallAdvisor.tsx:288` — the crisis call dialogue
- `city/EraAdvanceCeremony.tsx:212` — the advance ceremony
- `city/onboarding/DemoReel.tsx:91` — the first-run reel

The five `<Canvas>` mounts in the app (`three/CityScene.tsx:1223`,
`three/TitleBackdrop.tsx:190`, `three/BuildingThumb.tsx:131`, `onboarding/ReelBuilding.tsx:61`,
`three/GridworkModelPreview.tsx:384`) are all under `city/`, and no advisor component appears
inside any of them. It could not: the R3F reconciler does not render DOM intrinsics, so a
component whose output is `<div>` is a DOM component by construction.

### Why this changes what a brief has to specify

A building brief specifies a **mass, a plot in grid cells, a silhouette legible at zoom-out from
all four azimuths, and three build stages**, because the camera orbits a locked ~49° tilt and the
model is contain-fit to its footprint. An advisor brief specifies **a costume in four poses at
one square aspect ratio**, because the drawing is a flat figure that scales with its host box and
never rotates. Under D-ET9 there is one advisor for the whole run wearing ten costumes; the body
is written into the component's markup where no dress can reach it, and the dress arrives as an
`AdvisorDress` prop whose ten values live in `city/advisorDress.ts`.

---

## Stale documentation this trace turned up

Reported, not fixed. Each is quoted so it can be checked without re-deriving it.

1. **`docs/design-refs/BUILDING_ASSETS.md` describes a pipeline that does not exist.** It is a
   376-line handoff spec for **2:1 isometric sprites** — *"Format: WebP (preferred, smaller) or
   PNG"*, *"tile half-width 64, half-height 32"* — resolved through
   `resolveBuildingAsset(node_id, archetype, stage)`. That function does not exist anywhere in
   the tree, and the city has rendered GLBs since the 3D pivot of 2026-07-21. Its one accurate
   part is the 2026-07-28 correction banner at the top about retired gold mastery. Anyone
   handed this file today would author the wrong artefact in the wrong format.
2. **Two places still pin `art/sources/` at two files, and it holds three.**
   `buildingAssets.ts:357-359` — *"That directory is PINNED to exactly two files … set EQUALITY
   against `CityGuide.dc.html` + `OruAdvisor.dc.html`"* — and
   `art/building-sources/README.md:219-226`, under the heading *"Not `art/sources/` — that
   directory is pinned to exactly two files"*. The advice both give (put building sources in
   the sibling directory) is still right; only the count is stale.
3. **Two design docs say `output/imagegen/` holds briefs and no images**
   (`2026-07-30-era-palette-ladder.md:96-97`,
   `2026-08-01-era-and-crisis-music-brief.md:66`); 51 PNGs are tracked there at this tip.
4. **`output/imagegen/era-03-bronze-age-building-briefs/README.md:1347-1348`** refers to *"the
   ten images beside it"*; that directory holds a `README.md` and a `.jsonl` and no images.

---

## Related

- `apps/web/src/city/buildingAssets.ts` — the skill-model registry, `nodeFilePrefix`, and the
  fail-closed resolver. Its docblock is the best single account of why the glob is non-recursive.
- `apps/web/src/city/art/building-sources/README.md` — the four exporters, their naming keys,
  and which stages are committed rather than merely reproducible.
- `apps/web/src/city/art/sources/README.md` — the advisor shelf and its census.
- `docs/superpowers/specs/crisis-reference-packs/README.md` — the four packs, the mechanic
  inventory, and the renderer boundary re-measured at `e53bf9cd`.
- `docs/design-refs/hard-winter-crisis/README.md` — the photographed alternative to a generated
  crisis pack, and the 1024x580 rule.
- `.cursor/skills/era-building-briefs/SKILL.md` — the skill that produces a building brief.
