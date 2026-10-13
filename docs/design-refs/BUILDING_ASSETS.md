# Building art drop-in format (the city's building models)

> **CORRECTED 2026-08-03 — THIS FILE DESCRIBED A WebP SPRITE PIPELINE. THE CITY SHIPS `.glb`
> MODELS AND HAS SINCE `be9f00b`.** Everything about image files, sprite anchors, export pixel
> sizes and the two-tier asset registry described art that no code in the tree can load. Six
> claims were wrong in ways that would have sent a modeller down a dead end, each checked
> against the tree before it was corrected here:
>
> | Was | Is |
> | --- | --- |
> | "**Format:** `WebP` (preferred) or `PNG`", sprite sheets, `anchorX`/`anchorY` | **`.glb`**, exported from procedural three.js. **87** are tracked under `apps/web/src/city/art/models/` |
> | the resolver is `resolveBuildingAsset(node_id, archetype, stage)` | **`resolveBuildingModel(nodeId, stage)`** — no archetype argument, and no such function as `resolveBuildingAsset` exists anywhere in the tree |
> | `buildingAssets.ts` "globs only `*-built.glb`" | it globs **`./art/models/*.glb` minus `civic-*.glb`** (48 files today) |
> | the city "no longer loads" the early stages, which are procedural | **`MODEL_STAGES` is all three** — `site`, `construction`, `built` — and every node loads its own GLB for each. The procedural shells are the FAIL-CLOSED fallback for a node with no art |
> | to re-render, "drive `Gridwork.dc.html`" | **there is no such file, and there never has been in this repository.** The four committed exporters in `scripts/` are the route |
> | one registry (`buildingAssets.ts`), two tiers (per-node, per-archetype) | **four registries, one tier.** Per-archetype art was never wired and its registry symbols no longer exist |
>
> **`BUILDING_ASSET_REGISTRY`, `BUILDING_NODE_ASSET_REGISTRY`, `EXAMPLE_BUILDING_ASSET_ENTRY`,
> `BuildingAssetRegistry` and `resolveBuildingAsset` appear in this document and NOWHERE ELSE
> in the repository** (`git grep` finds one file each: this one). Nor do
> `apps/web/src/city/cityScene.ts` or `apps/web/src/city/art/buildings/`, both of which this
> file told you to put files in. The 2:1 isometric sprite projection is gone with them: the
> city is React Three Fiber (`city/three/CityScene.tsx`) on a 4-world-unit grid.
>
> **Corrected rather than rewritten**, because this file is cited from four places
> (`2026-07-26-d2-boomtown-square-island-design.md`, `2026-07-27-era-progression-design.md`,
> `eras/era-01-prehistoric/style-guide.md`, `work-log/evan.md`) and one of them sends readers
> here specifically for §9's retired-Gridwork history, which is kept. Every section keeps its
> number; superseded passages are marked in place rather than deleted, in the same style as
> the 2026-07-28 banner below.

> **CORRECTED 2026-07-28 — the gold BODY treatment was retired and never shipped, so every
> instruction in this file to gild the `mastered` stage is withdrawn. The reservation of `#FFB703`
> stands; the claim that a body ever renders gold does not.** Four places carried it and are
> corrected in place: §2's *"**Mastered = gold**"* bullet, §3's stage table, §7's `tint` field, and
> §9's stage→model mapping. The shipped code: `apps/web/src/city/buildingAssets.ts:44` — *"Full
> mastery renders as the normal `built` model — there is no gold-mastered stage and no gold tint"*,
> and `:202` — *"Full mastery renders the plain `built` model (no gold pass)"*;
> `apps/web/src/city/palette.ts:253-254` — *"No stage is ever tinted gold — mastery is not shown as
> a gold building"*; `masteryVisuals.ts:16` — *"Stars REPLACE the retired gold body-tint."*
>
> **What to draw instead:** nothing extra. Full mastery reuses the `built` model at its normal body
> colour, and mastery is carried by **0-3 gold `#FFB703` stars floating above the roofline**, drawn
> by the engine (`three/MasteryStars.tsx:69`), not by your asset. So **you never author a
> `mastered` file.** `#FFB703` is still reserved — it lives on those stars and on UI accents (the
> Build button, the readiness meter) — so it still must not appear as decoration in your art.
>
> *(**Where its four cross-references now stand, 2026-08-03.** §2's bullet and §9's mapping are
> still there and still corrected. §3's stage table no longer has a `mastered` row at all —
> `mastered` stopped being a `BuildStage` — and §7's `tint` field is gone with the sprite
> registry it belonged to. So the treatment is doubly withdrawn: retired in the engine, and now
> without a field to apply it through. The reservation of `#FFB703` is unaffected.)*

How to hand off building art so it drops straight into the city with **zero code changes to
the renderer**. There is exactly one key and it is the **node id**: name a file
`<nodeFilePrefix(node_id)>-<stage>.glb`, drop it in `apps/web/src/city/art/models/`, and the
node renders it. No registry entry, no resolver change.

```
NUM.2 → num-2-site.glb   num-2-construction.glb   num-2-built.glb
```

`resolveBuildingModel(nodeId, stage)` (`apps/web/src/city/buildingAssets.ts`) does the lookup
and **fails closed**: a node with no GLB for a phase renders the shared neutral procedural
shell for that phase (`three/constructionStages.ts`), never nothing. It is gated on a name
map, so a bundled GLB stays unread until its node is named there — see §7.

> **THE MISSING TIER, RECORDED SO IT IS NOT LOOKED FOR.** This file used to describe a
> **per-ARCHETYPE** fallback tier keyed on answer type (`numeric` → one hall shared by every
> numeric skill), resolved after the per-node tier and before the procedural one. It was never
> wired to art and its registry is gone. `archetype` survives in the product as a **label** —
> `data-archetype` on a plot button, the roster's answer-type read — and drives no geometry.
> §4 keeps the grid it described, marked superseded, because two later design documents cite
> this file for the "style family" idea.

---

## 1. File format

- **Format:** **binary glTF (`.glb`)**, one file per `(node, stage)`. There is no image loader
  in the building path at all: `art/` holds 87 `.glb`, three advisor `.dc.html`, three
  building-source `.dc.html` and three READMEs, and not one `.webp`, `.png` or `.svg`.
- **Producing one:** the shipped models are not drawings, they are **procedural three.js** —
  a builder class that emits a `THREE.Group`, exported through `GLTFExporter`. If your art is
  procedural, commit the source under `apps/web/src/city/art/building-sources/` and add an
  exporter beside the four in `scripts/` (§9). If it is a mesh you modelled, export `.glb`
  directly; nothing in the loader cares which.
- **Export with the app's three.** The exporters bundle `three` from `apps/web/package.json`
  on demand rather than committing a copy, so a GLB is never written by one revision and read
  by another across the r152 colour-management change.
- **Materials:** `MeshStandardMaterial` survives glTF intact. `MeshToonMaterial` does not —
  glTF has no toon material, so the exporter warns once per material and writes colour, map
  and opacity through the generic path; the city's `reviveMaterial`
  (`three/PlacedBuilding.tsx`) re-applies what glTF cannot carry.
- **Colour space:** hand a raw sRGB hex to `new THREE.Color(...)` and let r185 convert. Do
  **not** call `.convertSRGBToLinear()` yourself — that is one conversion too many under r185
  and exports every surface measurably too dark. (Era two's source does call it, because it
  was written against r128, which is why its two exporters disable colour management for
  exactly the span of the build. Era one's does not and must not.)
- **Keep the ground pad in.** The shipped sets all include their own pad, and
  `PlacedBuilding.prepareModel` contain-fits whatever it is handed to the node's footprint —
  so a model without a pad renders systematically LARGER on the same plot than its neighbours.

> *(This section read "**Format:** `WebP` (preferred, smaller) or `PNG`. Both support the alpha
> channel we need", with a transparent background, an sRGB 8-bit colour profile and optional
> sprite sheets. Nothing in the tree loads an image as a building.)*

---

## 2. Fit (so the model lands on its plot)

The city is **3D**, on a grid of `GRID_CELL = 4` world units (`city/worldLayout.ts`). A
building occupies a whole-cell **footprint** (`{ w, d }` in cells) frozen by INV-ERA-1, and
the renderer scales your model to it:

- **One UNIFORM contain-fit**, `footprintFitScale(sizeX, sizeZ, footprint)` — the smaller of
  the two axis fits, at `FOOTPRINT_FILL = 0.95` of the plot. So **your model's width:height
  survives the fit untouched**, and its own units do not matter: only its PROPORTIONS do.
- **Two things follow, and neither is intuitive.** A smaller plot cannot make anything read
  taller or more slender — it scales the whole model down. And on a shared plot size, the
  taller building is simply the more slender one, by the inverse ratio of their native
  width:height. (Era one's guide has both measured: the Lookout renders 2.03× the Roundhouse
  on the same 2×2 plot purely on proportion.)
- **Height is capped** at 6 cells (24u), so an over-tall tower cannot throw its silhouette
  across neighbouring cells from the fixed village camera. Only over-tall models are affected.
- **Lighting (match the art bible §2):** one soft key light — **top face light, left wall mid,
  right wall dark**. Keep the light direction consistent with the procedural shells so a mixed
  city reads as one place.
- **Keep gold out of your art entirely.** Mastery gold `#FFB703` is reserved and the engine
  carries it on the mastery **stars** above a topped-out building, never on the body — so
  there is no gilded `mastered` asset to author, and gold must not appear as decoration.
  *(This bullet read "**Mastered = gold.** The `mastered` (gold-mastered) stage should
  incorporate the reserved mastery gold `#FFB703`" — see the second banner at the top of this
  file.)*

> **SUPERSEDED 2026-08-03 — the sprite-fit rules and the export-size table.** This section
> asked you to *"draw the isometric base to span the full image width"* on a **2:1 isometric**
> projection (tile half-width `64`, half-height `32`), anchor at bottom-centre via
> `anchorX: 0.5` / `anchorY: 1`, and export at ~4× a per-archetype `worldWidth` — with this
> table of pixel budgets:
>
> | Archetype (answer-type) | Silhouette | Footprint (hw · hh · fullHeight) | Default `worldWidth` | Recommended export (≥) |
> | --- | --- | --- | --- | --- |
> | `numeric` | hall | 50 · 25 · 46 | 100 | **400 × 440 px** |
> | `constructed_response` | workshop | 42 · 21 · 58 | 84 | **340 × 400 px** |
> | `multiple_choice` | tower | 27 · 14 · 96 | 54 | **220 × 580 px** |
> | `generic` | block | 40 · 20 · 54 | 80 | **320 × 380 px** |
>
> **None of it applies.** There is no isometric projection to land on, no image to anchor, no
> pixel budget to hit, and `worldWidth` / `anchorX` / `anchorY` are not fields of anything.
> (`anchorY` does appear in `three/CityScene.tsx` — it is a callout's height in world units,
> an unrelated name.) The table is kept because it records the four answer-type silhouettes
> the archetype tier would have used, which §4 and two design documents refer to.

---

## 3. Build stages

**You author exactly three files per building**, and they are `MODEL_STAGES`
(`buildingAssets.ts`). The stage words are the art sources' own picker: "Cleared ground",
"Frame up", "Finished".

| Model stage | Drawn from | Depicts |
| --- | --- | --- |
| `site` | `not_started` / `teaching` / `preview` | The plot cleared and staked out — turf stripped, corner posts driven, cordage strung. |
| `construction` | `practice` | The building's OWN frame, roof still off — not a generic scaffold. |
| `built` | `complete` (and the legacy `gold` / `unfinished`) | Full volume, topped out. |

`BuildStage` (`city/palette.ts`) carries a fourth value, `advanced`, which
`modelStageForBuildStage` maps to the `built` model. **Nothing derives it any more** — its
own docblock says so, and `buildStageFor` never returns it — so it is a legacy key in the
model map rather than a stage you can see. Full mastery renders the plain `built` model and
floats 3 gold `#FFB703` stars above the roofline (`three/MasteryStars.tsx`); the body is
unchanged.

> **CORRECTED 2026-08-03.** This table listed **five** registry keys including a `mastered`
> stage, and said of `site` and `construction`: *"Usually leave procedural."* Both are wrong
> now. `mastered` is not a `BuildStage` at all any more, and the early phases are the OPPOSITE
> of optional — a skill building is *built through mastery*, so the city asks for `site`, then
> `construction`, then `built` as the learner moves through the lesson, and all three are what
> makes a node build up **as itself** rather than through a shared scaffold. A missing early
> stage is a visible regression, not a saving. (Only **bought** civic buildings and the always-
> `built` town hall legitimately ship one stage; see §5.)

---

## 4. Answer-type silhouettes (the superseded archetype grid)

> **SUPERSEDED 2026-08-03 — there is no archetype tier.** This section computed how many files
> a re-skin of the D1 island needs by multiplying archetypes by stages. The archetype registry
> it multiplied does not exist; the count is **nodes × 3**, and it is §5's key that decides
> the filenames. The grid is kept below because it is a correct statement of which answer type
> each D1 node has, which is what the two design documents citing this file want from it.

D1 buildings derive their **label** archetype from the item bank's authored `answer_type`
(`engines/game/src/descriptors.ts`). D1 resolves to two:

| D1 node | answer_type | Archetype label (silhouette the retired tier would have used) |
| --- | --- | --- |
| NUM.S | numeric | `numeric` (hall) |
| NUM.F | numeric | `numeric` (hall) |
| NUM.2 | numeric | `numeric` (hall) |
| NUM.5 | numeric | `numeric` (hall) |
| NUM.3 | expression | `constructed_response` (workshop) |
| NUM.4 | expression | `constructed_response` (workshop) |

`multiple_choice` (tower) and `generic` (block) are defined for future districts and are not
used by D1.

*(This section asked for "the two used archetypes × the three authored stages = **6 images**"
named `numeric-built.webp` and so on, with a 2-image minimum. No such filename is loadable.
It previously asked for ten, listing `mastered` sprites — **corrected 2026-07-28** — and both
counts are now moot: the six D1 buildings are **18** GLBs, one per node per stage, because
every node has its own building at every phase.)*

---

## 5. Naming convention

**The node id is the durable half of every filename**, and `nodeFilePrefix` is the whole rule
(`buildingAssets.ts`): lowercase the id, turn `.` into `-`.

```
<nodeFilePrefix(node_id)>-<stage>.glb        NUM.S → num-s-built.glb
                                             RAD.4 → rad-4-site.glb
                                             LIN.1 → lin-1-construction.glb
```

So `num-2` in a filename means node `NUM.2`, always, in any era. This is safe by
**construction** rather than convention: node ids are the registry's primary key, no id
contains a dash, and every id in the graph yields a distinct prefix after lowercasing —
`buildingAssets.test.ts` asserts that over the whole node set rather than assuming it.

**A building class that is not a graph node has nothing for `nodeFilePrefix` to work from, so
it needs a key of its own.** Three do, and each pays for the flat directory differently:

| Class | Key | Where | Owner |
| --- | --- | --- | --- |
| Skill building | `<nodeFilePrefix>-<stage>.glb` | `art/models/`, flat | `buildingAssets.ts` |
| Bought civic | `civic-<type-id>-<stage>.glb` | `art/models/`, flat | `civicBuildings.ts` |
| Town hall (hub) | `townhall[-<era>]-<stage>.glb` | `art/models/townhall/` | `townHall.ts` |
| Road tile | `road-<shape>.glb` | `art/models/roads/` | `roadModels.ts` |

The civic `<type-id>` is the **shipped catalogue id** with `_` collapsed to `-`
(`water_spring` → `civic-water-spring-built.glb`), never the art's own slug — era one learned
that by nearly naming twelve files after slugs the economy holds no key for. Era two onward
prefixes the era (`civic-neolithic-granary-built.glb`) because `civicCatalogue.ts` states its
convention as `<era>_<slug>`; era one's four are unprefixed because that registry predates it.

> **THE TRAP: THE *DESCRIPTIVE* HALF OF THE NAME HAS ALREADY DRIFTED, AND ERA ONE IS THE
> WORST CASE.** The node half is durable; the human-readable half is not, and a modeller who
> pairs a building to a node by NAME will get it wrong. Measured at era one's source
> (`_rosters().core` in `civic-era-01-all-stages.dc.html`) against the names the game ships
> (`eraDressing.ts`), **five of the six no longer agree and only `lookout` does**:
>
> | Art slug | The source's own name | What the game calls it | Node |
> | --- | --- | --- | --- |
> | `round` | Gathering Round | **the Roundhouse** | `NUM.S` |
> | `store` | Long Store | **the Hide Shed** | `NUM.F` |
> | `shelters` | Shelters | **the Hut Cluster** | `NUM.2` |
> | `teaching` | Teaching Ground | **the Tool Shelter** | `NUM.3` |
> | `cleared` | Cleared Ground | **the Clearing** | `NUM.4` |
> | `lookout` | Lookout | **the Lookout** | `NUM.5` |
> | `hearth` | Great Hearth | **the Stone Circle** | — (the hub) |
>
> **`round` is the dangerous one.** "Gathering Round" was `NUM.S`'s dressing until D-ERA31
> moved that NAME to the hub (then renamed it again to the Stone Circle), so the slug now
> reads like the hub's while the art is still the skill building's. Pair by name and the town
> hall and `NUM.S` swap.
>
> **So do not pair by name — measure it.** `_stageCleared` pads every `site` model to
> `foot.w + 7 × foot.d + 7` and era one's seven `foot` literals are distinct in that
> projection, so `node scripts/export-era1-skill-models.mjs --check-mapping` reads each
> committed `*-site.glb`'s footprint and reports which builder is the ONLY one that fits.
> That is the pairing proven against the bytes the game loads rather than against a document.

---

## 6. Where the files go

```
apps/web/src/city/art/models/                  ← skill + civic GLBs, FLAT
apps/web/src/city/art/models/townhall/         ← the hub's, own glob
apps/web/src/city/art/models/roads/            ← road tiles, own glob
apps/web/src/city/art/models/gridwork-modern/  ← PRESERVED, deliberately invisible (§9)
apps/web/src/city/art/building-sources/        ← the .dc.html art SOURCES (not bundled)
```

**FLAT, and never a per-era subdirectory.** Two hazards make that load-bearing rather than
tidy:

1. **The model glob is NON-RECURSIVE.** `art/models/d2/exp-1-built.glb` would be invisible —
   `resolveBuildingModel` would fail closed to a procedural shell with every test still green.
2. **Making it recursive is worse.** The registry is keyed by BASENAME, and
   `gridwork-modern/` holds 21 preserved `num-*` basenames that would then compete with the
   live ones, with glob key order deciding which art the city wears. It currently sorts
   before `num-*` so the live entry wins — luck, not design.

A subdirectory earns its own registry (`townhall/` → `townHall.ts`, `roads/` →
`roadModels.ts`) or it does not exist. Any future era work must key on the full path.

**Sources do not go in `art/sources/`.** That directory is the ADVISOR shelf and
`lessons/cityGuidePreserved.test.tsx` asserts set equality over it against a named table, so a
building source dropped there breaks a guard that is doing real work. Building sources go in
the sibling `art/building-sources/`, outside both that census and the model glob.

> *(This section said `apps/web/src/city/art/buildings/numeric-built.webp`. That directory does
> not exist; `art/` holds `models/`, `building-sources/` and `sources/`.)*

---

## 7. How to register them — you mostly don't

**There is no registry literal to edit for a skill model.** Four `import.meta.glob` calls pick
the files up by path, each keyed by basename, and the four populations are disjoint by
construction:

| Registry | Glob | Files today |
| --- | --- | --- |
| `buildingAssets.ts` | `./art/models/*.glb` **minus** `./art/models/civic-*.glb` | 48 |
| `civicBuildings.ts` | `./art/models/civic-*.glb` | 12 |
| `townHall.ts` | `./art/models/townhall/*.glb` | 5 |
| `roadModels.ts` | `./art/models/roads/*.glb` | 1 |

That is 66 of the 87; the other 21 are `gridwork-modern/`, invisible to all four. The
`civic-` exclusion is what lets the flat directory hold two tenants, and **both directions are
asserted** — `buildingAssets.test.ts` checks no civic url leaks into the skill set and
`civicBuildings.test.ts` checks no skill url leaks into the civic set.

**What DOES need a line of code is the NAME, and it is a design decision rather than
plumbing.** `resolveBuildingModel` resolves no GLB for a node absent from its name map, so a
new era's models sit bundled and unread until its nodes are named:

1. an entry in that era's `*_NODE_BUILDINGS` record in `buildingAssets.ts` — a stable,
   era-neutral `building` handle plus the `gridworkId` mass the era style guides join on;
2. a row in `eraDressing.ts` for the era's dressing subtitle, which composes the display name
   as `"{stable}, {subtitle}"`.

Both are rulings (D-ERA9 / D-ERA29), not wiring: naming the buildings is the decision, and the
loader is keyed on the node id either way.

> *(This section told you to edit `BUILDING_ASSET_REGISTRY` and `BUILDING_NODE_ASSET_REGISTRY`
> in `buildingAssets.ts`, gave a TypeScript literal with `src` / `anchorX` / `anchorY` /
> `worldWidth` / `tint` / `note` fields, and pointed at an `EXAMPLE_BUILDING_ASSET_ENTRY`
> placeholder with `src: null`. **None of those five names exists in the repository.** The
> `tint` field carried its own 2026-07-28 correction about not gilding `mastered`; that
> correction stands as a statement about the treatment, but there is no field to apply it to.)*

---

## 8. Verify

1. Drop the three GLBs in `apps/web/src/city/art/models/` under §5's naming.
2. Confirm the node is named in `buildingAssets.ts` + `eraDressing.ts` (§7) — a bundled GLB
   with no name entry renders the procedural shell and every test stays green.
3. `npm run dev -w @cr/web` and open the model bench at **`?three`**
   (`city/three/GridworkModelPreview.tsx`): a building/stage picker over a free-orbit canvas,
   with era one's six nodes and the hub, era two's five and era three's five, all derived from
   `ERA_SEQUENCE` so a new era's nodes reach it for free.
4. In the city, work the node's lesson (or the dev panel) to see `site → construction →
   built` — the three the 3-step progression actually derives.
5. Toggle **reduced motion** and the **day/night/colorblind** lighting — the model should
   still read (shape + label carry meaning; never rely on colour alone).
6. Temporarily rename a file to confirm the **procedural fallback** still renders
   (fail-closed).
7. `npm run test -w @cr/web` stays green. The registry guards are `buildingAssets.test.ts`
   (glob shape, counts, disjointness), `era1SkillModels.test.ts` and
   `era2SkillModels.test.ts` (which eras have exported art, asserted both ways).
8. If the model came out of an exporter, `node scripts/<exporter>.mjs --check` must be green:
   that is the assertion that the bytes in the tree are the bytes the source produces.

---

## 9. What is actually in `art/models/` — the inventory, and who can regenerate what

**87 tracked `.glb`.** The number that matters for a modeller is not the total but what can be
REGENERATED, because "no exporter" means nobody can redraw the file, diff a change to it, or
say what it was drawn from. Three tiers, and the middle one is unique to era one:

- **44 are byte-reproducible** from one of four committed exporters — `--check` green.
- **21 (era one's) have an exporter and a committed source, and it does not reproduce their
  bytes.** The buildings are derivable; these particular files were not made this way. Read
  the subsection below before touching them.
- **22 have no committed source at all**: the 21 preserved `gridwork-modern/` models and one
  road sample.

| Cohort | Files | Source | Exporter |
| --- | --- | --- | --- |
| Era one civic (`civic-{campfire,longhouse,smokehouse,water-spring}-built`) | 4 | `civic-era-01-all-stages.dc.html` | `scripts/export-civic-models.mjs` |
| Era two skill (`exp-1-*`, `rad-1..4-*`) | 15 | `era-02-neolithic-all-buildings.dc.html` | `scripts/export-era2-skill-models.mjs` |
| Era two civic + hub | 5 | the same file, second lane | `scripts/export-era-two-civic-models.mjs` |
| Era three skill + civic + hub (`lin-*`, `civic-bronze-age-*`, `townhall-bronze-age-built`) | 20 | `era-03-bronze-age-all-buildings.dc.html` | `scripts/export-era3-building-models.mjs` |
| **Era one skill (`num-*`) + hub (`townhall-{site,construction,built}`)** | **21** | `civic-era-01-all-stages.dc.html` | `scripts/export-era1-skill-models.mjs` — **but see the divergence below** |
| Preserved Gridwork set (`gridwork-modern/`) | 21 | not committed | none |
| Road kit sample (`roads/road-straight-rounded.glb`) | 1 | not committed | none — and nothing renders it |

**All five exporters share one shape**, and a sixth should copy it: evaluate the `.dc.html`
bundle's builder class **verbatim** in headless Chromium against the app's own three, replace
`Math.random` with a mulberry32 stream **seeded from the output basename**, write GLB, and
offer `--check` (are the tree's bytes reproducible?) and `--no-seed` (the counter-
demonstration that makes a green `--check` mean something). Nothing is hand-ported: a
hand-port of 1,500 lines of geometry would be a second source of truth and would drift from
the artist's the first time he re-exports.

**The road sample is registered and unrendered.** It is a composite kit sample — a curve, a
jog, a straight run and a stub around one junction on a 74×62 grass base — not a tileable
single-cell straight, so the live network renders procedurally, styled to match it. It is kept
so a future authored per-shape tile can be swapped in without touching the building loader.

**Advisors are a different pipeline entirely and never become models.**
`art/sources/*.dc.html` holds three advisor design sources, each **hand-ported to a `.tsx`
component** that renders as **DOM** — `<div>`s and CSS, outside any `<Canvas>` — so nothing
there is a GLB or ever will be. Do not look for an advisor in `art/models/`, and do not put a
building source in `art/sources/` (§6).

### Era one's 21 files: an exporter exists, and it does NOT reproduce them

`scripts/export-era1-skill-models.mjs` derives all three stages of all seven era-one core
buildings from the committed source, reproducibly. **Its bytes are not the tree's**, and the
gap is measured rather than guessed (`--diff-tree`):

- **The palette: every base colour in all 21 committed files is the export's colour with each
  8-bit sRGB channel moved 18% toward 255.** `_pad`'s `P.dirtDk` `#8C6A44` = (140, 106, 68) is
  `#A18566` = (161, 133, 102) in the tree. `--diff-tree --lift` applies that pass and reads
  `identical` for all 21, so this half is fully explained and reproducible.
- **The mesh layout is not reproducible from this source.** Each committed file holds one
  merged, wholly NON-indexed mesh per unique material (`num-s-built.glb` is 24 meshes over 24
  materials) where a plain export emits one per primitive, 47 to 334 per file.

`be9f00b6` is why: the delivered HTML page only PREVIEWED — no `GLTFExporter` in any of its 14
bundled resources — so the models were regenerated by driving `GLTFExporter` against a module
called `era1-prehistoric.js` that **was never committed**, then lifting the palette. So the
exporter is a new route to era one's art, not a recovery of the old one, and **a bare run
writes to a scratch directory**; `--out` at the live model directory refuses without
`--replace-shipped-art`, because running an export script must not restyle every era-one
building as a side effect.

### D1's per-node buildings, and the retired Gridwork kit

D1 ships **six distinct buildings, one per skill**, plus the hub. Per-node keying is what lets
each skill look different where four of them share the `numeric` answer type.

| D1 node | Building | Gridwork id | `worldWidth` |
| --- | --- | --- | --- |
| NUM.S | Deco Tower | `deco` | 58 |
| NUM.F | Glass Slab | `slab` | 128 |
| NUM.2 | Brownstones | `rowhouse` | 138 |
| NUM.3 | School | `school` | 146 |
| NUM.4 | Park | `park` | 138 |
| NUM.5 | Tower | `tower` | 50 |

> **THIS TABLE DESCRIBES THE RETIRED GRIDWORK KIT AND IS NO LONGER A LOOKUP FOR THE LIVE MAP.**
> Both of its right-hand columns moved. `be9f00b` replaced all 21 GLBs in place with era one's
> prehistoric set (the kit itself is preserved and deliberately unwired at
> `../../apps/web/src/city/art/models/gridwork-modern/`, which carries the display names too), and
> on 2026-07-29 the five surviving Gridwork ids were renamed onto the six ordinary types the ten
> era style guides share: **`deco` → `hall`, `slab` → `store`, `rowhouse` → `dwelling`, `school` →
> `workshop`, `park` → `yard`, `tower` unchanged.** The table is kept as written because each old
> id names *this* art — `deco` really was an art-deco tower. For the live map read
> `D1_NODE_BUILDINGS` in `buildingAssets.ts`; for what each mass is now, the ten guides in
> `../superpowers/specs/eras/`.
>
> **The `worldWidth` column is doubly dead** (corrected 2026-08-03): it was a per-entry override
> on the sprite registry, and there is no such field and no such registry. A model's rendered
> size comes from §2's uniform contain-fit to the node's footprint.

> **The four per-node art notes this section carried** — NUM.2's Terminal → Brownstones, NUM.F's
> Cathedral → Glass Slab, NUM.4's Factory → Park, and the shared-neutral construction phases —
> **all describe the retired kit and are superseded by `be9f00b`.** The one worth keeping is
> the *reason* the early phases were briefly shared: the `built` models had been swapped to
> newer designs while their `site`/`construction` GLBs had not, so a node under construction
> rendered as a *different* building. Era one's set fixed that at the root by drawing all three
> phases of each building together, which is why §3 now requires all three.

### Final stage → model mapping

| Build stage | Rendered as | Source |
| --- | --- | --- |
| `site` | the node's own cleared plot | per-node GLB (`<prefix>-site.glb`) |
| `construction` | the node's own frame | per-node GLB (`<prefix>-construction.glb`) |
| `built` | the node's own building | per-node GLB (`<prefix>-built.glb`) |
| `advanced` | the built model | **reuses** `built`, unchanged |
| *(no GLB for a phase)* | shared neutral shell | procedural (`three/constructionStages.ts`) |

Full mastery renders the plain `built` model — **no gold pass**; the engine floats 3 gold
`#FFB703` mastery stars above the roofline instead (`three/MasteryStars.tsx`).

> **CORRECTED 2026-08-03.** This mapping said `site` and `construction` were *"**shared**
> neutral"* and procedural for every node, that *"only `built` is a per-node GLB"*, and that
> *"each building needs only **one** authored GLB"*. All three were true of the retired kit and
> are false now: `MODEL_STAGES` is `["site", "construction", "built"]`, every era-one, era-two
> and era-three node loads its own GLB for each, and `buildingAssets.test.ts` asserts the three
> urls per node are distinct. The procedural shells did not go away — they became the
> **fail-closed fallback**, which is what stops an unmapped node being an invisible building
> and therefore an unreachable lesson: the city's roster stopped being a domain's six `mvp`
> nodes and became the era's, so 56 of the 62 in-product nodes became placeable with no model.
>
> The twelve `num-*-site.glb` / `num-*-construction.glb` files this section said the live city
> *"no longer loads"* are loaded, at every learner's first lesson.
