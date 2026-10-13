# `art/building-sources/` — incoming HTML/SVG design sources for city buildings

**Put building design sources here.** This is the drop directory for the hand-authored
HTML/SVG art a building is designed in, before it becomes a GLB.

## What is here

| File | Covers | Exported by | To |
| --- | --- | --- | --- |
| `civic-era-01-all-stages.dc.html` | Era one's **four civic buildings**, all three stages each | `scripts/export-civic-models.mjs` | `art/models/civic-<type>-<stage>.glb` (12 emitted, **4 committed**) |
| `era-02-neolithic-all-buildings.dc.html` | Era two's **four civic buildings + its hub**, all three stages each | `scripts/export-era-two-civic-models.mjs` | `art/models/civic-neolithic-<slug>-<stage>.glb` and `art/models/townhall/townhall-neolithic-<stage>.glb` (15 emitted, **5 committed**) |
| `era-02-neolithic-all-buildings.dc.html` | Era two's **five skill buildings** — a SECOND lane out of the SAME file | `scripts/export-era2-skill-models.mjs` | `art/models/<node-prefix>-<stage>.glb` (15 emitted, **15 committed**) |
| `era-03-bronze-age-all-buildings.dc.html` | Era three's **five skill + four civic + hub**, all three stages each | `scripts/export-era3-building-models.mjs` | 30 emitted; **15 skill stages + 4 civic built + 1 hub built committed** |
| `era-04-classical-all-buildings.dc.html` | Era four's **five skill + four civic + hub**, all three stages each | `scripts/export-era4-building-models.mjs` | 30 emitted; **15 skill stages + 4 civic built + 1 hub built committed** |
| `era-05-medieval-all-buildings.dc.html` | Era five's **five skill + four civic + hub**, all three stages each | `scripts/export-era5-building-models.mjs` | 30 emitted; **15 skill stages + 4 civic built + 1 hub built committed** |

### `era-05-medieval-all-buildings.dc.html` — embedded procedural kit

This is a byte-for-byte copy of the delivered standalone HTML: **1,659,071 bytes**, SHA-256
`493fbec1c5677cb7952cfab9e872897d505334d105ed65c01c86d3717596335a`. It has no
sibling dependency. Its 19-entry manifest is seven JavaScript resources, two HTML resources,
one CSS resource and nine embedded WOFF2 fonts; it contains no PNG, SVG, GLB or other model
payload.

The reusable art is the one gzip-compressed JavaScript entry with decoded SHA-256
`620d33e067391f5f1c6cc8bf80abeb46cca248cb2b2040946d741e6de96f91b0`. It defines
`window.Era5Kit` for bundled Three.js r128; `defs()[key](phase)` returns a `THREE.Group` for
ten exact keys and `site | construction | built`. The standalone also embeds Era3Kit and
Era4Kit resources for its inspector. The exporter selects Era5Kit by its global and refuses
zero or multiple matches.

The source roster predates the current product registry. It calls four skill targets
`CLO.1`–`CLO.4`, classifies `houses` as civic, and calls the hub generically `the Town Hall`.
The exact building names and unique hub/civic roles make the current join unambiguous; the
source stays untouched and the translation is recorded here:

| Source key | Source target | Runtime target | Source plot | Frozen runtime plot |
| --- | --- | --- | --- | --- |
| `townhall` | `hub` | Medieval Town Hall / the Court House | 3×3 | 3×2 |
| `chapel` | `civic` | `medieval_chapel` / The Chapel | 2×2 | 1×1 |
| `barn` | `civic` | `medieval_great_barn` / The Great Barn | 3×2 | 2×2 |
| `castle` | `civic` | `medieval_cottages` / The Castle | 3×3 | 2×1 |
| `houses` | `civic` | `RAT.6` / the Timber Houses | 2×1 | 2×1 |
| `fair` | `civic` | `medieval_market_square` / The Fairground | 2×2 | 2×2 |
| `weaver` | `CLO.1` | `RAT.1` / the Weaver's Shop | 2×2 | 2×2 |
| `woolstore` | `CLO.2` | `RAT.2` / the Wool Store | 3×2 | 2×1 |
| `guildhall` | `CLO.3` | `RAT.3` / the Guild Hall | 3×2 | 2×2 |
| `tower` | `CLO.4` | `RAT.4` / the Tower House | 1×1 | 2×2 |

The Wool Store alone quarter-turns at export: the authored body's long axis is Z while its
frozen 2×1 gameplay plot is long on X. Everything else keeps the source orientation.
Runtime uses one uniform contain-fit; no gameplay footprint changes and no model is stretched.

Two finished buildings needed more composition to fit their frozen square runtime plots. The
canonical standalone remains byte-identical; the exporter applies exact, fail-loud source
transforms that use Era5Kit's own structural primitives:

- The Great Barn keeps its original nave and adds two low working side aisles with rubble
  outer walls, repeated oak posts and buttresses, and separate slate lean-to roofs.
- The Guild Hall keeps its low open market arcade and existing stair turret and adds the
  ratified lower rear service range, with its own rubble ground storey, framed upper storey,
  windows and tiled roof.

Both amendments also add their set-out to `site` and partial structure to `construction`, so
the three-stage sequence stays coherent. No whole group is scaled non-uniformly, and neither
amendment adds a generic terrain pad or loose diorama surround.

Era5Kit defaults to `bare = true`, which its own header defines as the building alone: no
ground pad, surrounding apron, planting, vehicles or loose goods. Ground that is part of the
building, such as the Fairground and interior floors, remains. The kit has 34 textual
`Math.random` call sites and two `CanvasTexture` sites. It explicitly converts material colours
from sRGB to linear as it did under r128, so the exporter disables r185's implicit colour
conversion while building and restores it afterward.

All fifteen skill phases ship because mastery requests them. Purchased civics and the
always-built Court House ship only `built`; their ten omitted early phases are exported under
`--all`, SHA-256-pinned in the exporter, and asserted in both directions by `--check`. Every
one of the thirty output bytes depends on the seeded stream: `--check --no-seed` reports
30/30 different.

```sh
node scripts/export-era5-building-models.mjs
node scripts/export-era5-building-models.mjs --check
node scripts/export-era5-building-models.mjs --all --out tmp/era5-all-stages
node scripts/export-era5-building-models.mjs --check --no-seed
```

Every invocation generates into an isolated staging directory first. A normal production run
generates all 30 source stages, checks the exact census, GLB 2 headers and non-empty bounds,
page warnings/errors, and all ten omitted-stage digests, then promotes only the 20 shipping
outputs. Promotion prepares every replacement as a sibling temporary file before its first
atomic rename and rolls prior renames back if promotion fails.

The CLI fails closed before model writes for unknown/duplicate flags, positional arguments,
missing `--out` values, `--all` without `--out`, `--no-seed` without `--check`, contradictory
check/output flags, custom output paths that resolve inside the production model tree through
lexical traversal or directory symlinks, and any planned destination file that is itself a
symlink (checked with `lstat`, including dangling links).

**Publication provenance note.** The standalone embeds the Three.js r128 MIT distribution
(decoded SHA-256 `9274bbcec8d96168626c732b5d31c775aa8cfb7eaa0599bec0c175908a2c1ce2`),
React-family runtime code, Babel CDN references, and nine WOFF2 resources. This source census
does not establish redistribution rights; confirm the delivered bundle and embedded-font
provenance before publishing the standalone source outside the repository.

### `era-04-classical-all-buildings.dc.html` — embedded procedural kit

This is a byte-for-byte copy of the delivered standalone HTML: **1,611,913 bytes**, SHA-256
`65d525c68cd840178031fba2e5fbf9044d13ad5cba8e34f5d50253e26f10b891`. It has no
sibling dependency and contains no PNG, SVG, GLB or other model/image payload. Its 18-entry
manifest is six JavaScript resources, two HTML resources, one CSS resource and nine embedded
WOFF2 fonts; the Google Fonts URLs in the template are preconnect hints, not asset dependencies.

The reusable art is the one gzip-compressed JavaScript entry with decoded SHA-256
`e3808a5f49e6f4aaf08f7690c9c3db9f48ffd0506d7650d3831a582a2ecaaece`. It defines
`window.Era4Kit` for bundled Three.js r128; `defs()[key](phase)` returns a `THREE.Group` for
ten exact keys and `site | construction | built`. The file also contains an Era3Kit resource
because the standalone inspector can show both eras; the exporter selects Era4Kit by its
global and refuses zero or multiple matches.

Era4Kit generates its detail maps with `CanvasTexture` and has 22 textual `Math.random`
call sites (many inside loops). It defaults to `bare = true`, which its own header defines as
the building alone: no ground pad, surrounding apron, water, planting, vehicles or loose
goods. Runtime exports preserve that default. The standalone inspector's optional full
diorama is useful reference art, but it is not geometry that belongs inside a gameplay plot.

The exact attachment join is:

| Source key | Runtime target | Source plot | Frozen runtime plot |
| --- | --- | --- | --- |
| `senate` | Classical Town Hall / Senate House | 3×3 | 3×2 |
| `baths` | `classical_baths` | 3×2 | 3×2 |
| `cottages` | `classical_apartment_block` | 2×1 | 1×2 |
| `fountain` | `classical_fountain` | 1×1 | 1×1 |
| `dock` | `classical_public_granary` | 3×2 | 2×2 |
| `stonecutter` | `POL.1` | 2×2 | 2×2 |
| `barracks` | `POL.2` | 3×2 | 2×1 |
| `customs` | `POL.3` | 3×2 | 2×2 |
| `cellars` | `POL.4` | 2×2 | 2×1 |
| `surveyor` | `POL.8` | 1×1 | 2×2 |

The Cottages alone quarter-turn at export: the source's long X axis becomes the catalogue's
long Z axis. Everything else keeps the source orientation. Runtime's existing uniform
contain-fit handles the plot-size differences without stretching a model, changing a
gameplay footprint or clipping geometry.

All fifteen skill phases ship because mastery requests them. Purchased civics and the
always-built hub ship only `built`; their ten omitted early phases are exported under
`--all`, SHA-256-pinned in the exporter and asserted in both directions by `--check`.
All thirty outputs depend on the seeded random stream, so `--check --no-seed` must report
30/30 different.

```sh
node scripts/export-era4-building-models.mjs
node scripts/export-era4-building-models.mjs --check
node scripts/export-era4-building-models.mjs --all --out tmp/era4-all-stages
node scripts/export-era4-building-models.mjs --check --no-seed
```

The CLI fails closed before creating a browser bundle or writing an output: unknown/duplicate
flags, positional arguments, missing `--out` values, `--all` without `--out`, `--no-seed`
without `--check`, and `--check` combined with `--all` or `--out` are errors.

**Publication provenance note.** The canonical attachment was delivered as project art and the
runtime exporter extracts only its Era4Kit resource. The preserved standalone also embeds a
Three.js r128 distribution carrying its MIT copyright notice, React-family runtime code, and
nine WOFF2 resources. This repository contains no top-level LICENSE/NOTICE file declaring those
embedded resources' redistribution terms. The source census records what is present; it does not
establish rights. Confirm the delivered bundle and embedded-font provenance before publishing the
standalone source outside the repository.

### `era-03-bronze-age-all-buildings.dc.html` — embedded procedural kit

This is a byte-for-byte copy of the delivered offline HTML (SHA-256
`2f22ee93224f9da63282c34cb63215676548087ced1c11b3e5840db402c12423`). It contains no
PNG, SVG, GLB or linked sibling asset directory. The reusable art is one gzip-compressed
JavaScript manifest entry defining `window.Era3Kit`; `defs()[key](phase)` returns a
`THREE.Group` for ten keys and `site | construction | built`.

The exporter extracts that entry rather than hand-porting it. Skill outputs use node-derived
flat basenames (`lin-1-site.glb`); civic outputs use catalogue-derived flat basenames
(`civic-bronze-age-terraced-fields-built.glb`); the hub uses
`townhall/townhall-bronze-age-built.glb`. Bought civic buildings and the always-built hub
bundle only `built`; their ten early stages remain recoverable and digest-checked by
`--check`. Run `--all --out tmp/era3-all-stages` to materialize all thirty outside the
production asset directory.

The attachment declares the Terraced Fields as 3×2 while the frozen gameplay catalogue is
1×2. Its exporter row quarter-turns that one group before GLB export, aligning the source's
long axis with the runtime plot's long axis. The runtime still uses its ordinary uniform
contain-fit: no geometry is stretched, clipped or allowed to spill, and the gameplay footprint
does not change.

### `era-02-neolithic-all-buildings.dc.html` — one file, two lanes, both eras

**ONE SOURCE FILE, TWO EXPORTERS, AND THAT IS DELIBERATE.** Evan's era-two drop is a single
bundle carrying era one's roster *and* era two's ten buildings — four civic, five skill, and
the hub. Two lanes take from it: this section's exporter owns the **four civic plus the
hub**, and the skill lane owns the five skill buildings. They are separate scripts because a
shared one is a shared merge conflict on every run; the file itself is copied once.

**What is actually inside it**, verified rather than assumed: the same self-unpacking
`.dc.html` shape as era one's. The document is a JSON string in a
`<script type="__bundler/template">` block, and inside it a `class Component extends DCLogic`
emits a `THREE.Group` per building. Era two lives on a **parallel** builder path from era
one's — `_nDefs()` / `_nStageCleared` / `_nStageFrame` with its own `NP` palette and `_n*`
primitive kit, beside era one's untouched `_defs()` / `_stageCleared` / `_stageFrame`.
`_nDefs()` holds ten entries: `granary`, `houses`, `oven`, `well` (civic), `seed`, `kiln`,
`pen`, `meet`, `tower` (skill) and `shrine` (hub).

**The civic naming key is the catalogue id, not the art slug and not era one's shape.**
`packages/economy/src/civicCatalogue.ts` states its convention as `<era>_<slug>`, so era two
is `neolithic_granary` → `civic-neolithic-granary-built.glb`. Era one's four are UNPREFIXED
(`civic-smokehouse-built.glb`) because that registry predates the catalogue and is keyed on
`@cr/game`'s `ERA_ONE_CIVIC_TYPES`; re-deriving era one through the catalogue would rename
four shipped files for nothing. The two id spaces are collision-free by construction.

**The hub is addressed the hub's way.** It is not a civic type and has no type id — it is a
sentinel — so its file is named explicitly in `townHall.ts`'s `TOWN_HALL_ERA_MODELS` and
lives in the `townhall/` **subdirectory** behind that module's dedicated glob, which is what
keeps it additional to the skill set's count rather than part of it.

**Only five of the fifteen are committed.** `built` for the four civic (bought, never built
through mastery — era one's `d9328f8` settled that at 2.56 MB) and `built` for the hub
(**D-TH4 was reversed**: the hall is always `built`). The other ten are exported and pinned
by SHA-256 in the exporter, so `--check` verifies recoverability rather than promising it.

**One finding worth knowing before you look for a civic scaffold:** era two's `_nFrames()`
authors a "Frame up" body for the five skill buildings and the hub **only**. There is no
`granary`, `houses`, `oven` or `well` frame, so a civic `construction` export is the generic
surround with no building inside it — which is also why four of the fifteen are unaffected by
`--no-seed` (they draw no random numbers at all). The exporter names those four and asserts
that list both ways.

**BOTH era-two lanes disable colour management, and the civic lane learned it the hard way.**
Its first cut did not, and all five committed models shipped doubly converted: the era's mud
brick `#B4714F` = (180, 113, 79) reached `baseColorFactor` as (0.1762, 0.0233, 0.0070), which
renders back as **(116, 42, 20)**. Re-exported with management off it is (0.4566, 0.1652,
0.0782) → **(180, 113, 79)**. `scripts/check-era-two-glb-colours.mjs` reads every factor out of
all twenty committed era-two GLBs and reports which family explains it, so this is a
measurement of the tree rather than a claim about the exporter — run it after any re-export.
Restoring the pre-fix granary turns it red at 15 doubled factors. See the skill lane's section
below for why the conversion is Evan's and correct at his three version.

#### The skill lane — `scripts/export-era2-skill-models.mjs`

*(The section above owns the file's shape, its `_nDefs()` roster and the civic and hub naming
keys, and is not repeated here.)*

**The file is a SUPERSET of `civic-era-01-all-stages.dc.html`, not a replacement for it**, so
era one's exporter is not obliged to move and has not moved. Measured rather than assumed:
all 25 of era one's builders (`_buildRound` … `_stageFrame`) appear in this file verbatim,
checked by lifting each one's first 400 characters out of the shipped era-one source and
finding every one of them here.

**The skill lane's naming key is `<nodeFilePrefix(node)>-<stage>.glb`, flat**, which is the
one `buildingAssets.ts` already reads — so the addresses are the skill graph's to decide, not
this script's. **Three basename spaces come out of this one file and they are disjoint**,
which is what makes a shared source safe in a flat directory:

| Lane | Basenames | Exporter |
| --- | --- | --- |
| Era two **skill** | `exp-1-*`, `rad-1-*` … `rad-4-*` (15) | `scripts/export-era2-skill-models.mjs` |
| Era two **civic** | `civic-neolithic-*` | the civic lane's own script |
| Era two **hub** | `townhall/townhall-neolithic-*` | the hall's own registry |

**The skill lane commits all fifteen files, which is the opposite of the civic lane's
five-of-fifteen, and it is a reason rather than an inconsistency.** A civic building is
*bought* and never advances off `built`, so its early-stage exports reach no code path. A
skill building is *built through mastery*: `resolveBuildingModel` is asked for `site`, then
`construction`, then `built` as the learner moves through the lesson, so all three have to be
in the tree. Era two's skill set also HAS a real `_nFrames()` body per building, where the
civic types have none — so a skill `construction` is Evan's authored frame rather than a bare
surround.

**Regenerating it is one command:**

```sh
node scripts/export-era2-skill-models.mjs                # rewrite all 15 GLBs
node scripts/export-era2-skill-models.mjs --check        # are the tree's bytes reproducible?
node scripts/export-era2-skill-models.mjs --check-colour  # the sRGB round-trip, measured
```

`--check --no-seed` reports **13 of the 15 DIFFERING**, which is what makes a green `--check`
mean something. The two it does not — `exp-1-construction.glb` and `rad-1-construction.glb` —
are genuinely seed-independent rather than accidentally equal, measured by two separate
unseeded exports agreeing with each other and with the tree; the exporter's header carries
the measurement.

**One thing differs from era one's export and it is not cosmetic: colour management is
disabled for the era-two build.** Era one's `_mat` hands a raw hex to `new THREE.Color`; era
two's `_nmat` calls `.convertSRGBToLinear()` itself, which was correct against the r128 the
source bundles and is one conversion too many under the r185 the exporter uses. Measured with
`--check-colour` on the era's body hue `#B4714F` = (180, 113, 79): managed exports a
`baseColorFactor` that renders back as **(116, 42, 20)**, unmanaged renders back as
**(180, 113, 79)**. Do not "fix" it by re-enabling colour management — the civic lane above did
not disable it at first and had to re-export all five of its models for exactly this reason.

**THE RESIDUE, NAMED RATHER THAN LEFT TO BE DISCOVERED.** Disabling management is right for
every material `_nmat` builds, because `_nmat` converts. It is one conversion too FEW for the
handful the source builds WITHOUT `_nmat`, which then carry raw sRGB where glTF wants linear
and render slightly too bright. Measured across all twenty models: **14 factors of roughly 360**,
all in two files — the kiln's three emissive fire hues (`#E0641F`, `#EE8A22`, `#F5C33C`) in
`rad-1-built.glb`, and the limewash `#EDE6D8` five times in the Shrine and once in the kiln.
`#EDE6D8` renders as (247, 244, 238) against an authored (237, 230, 216). That is a much smaller
error than the (116, 42, 20) the managed path produced on every surface, so the trade is
strongly worth taking, but it is a real divergence and fixing it properly means converting the
non-`_nmat` materials in Evan's source rather than flipping this flag back.

### `civic-era-01-all-stages.dc.html` — one file, twelve models

**IF YOU ARE WIRING CIVIC BUILDINGS UP, THE ONE LINE YOU NEED IS THE NAMING KEY:
`civic-<type>-<stage>.glb`, flat in `art/models/`, where `<type>` is `@cr/game`'s shipped
`EraOneCivicTypeId` with `_` collapsed to `-` (`water_spring` → `civic-water-spring-…`) and
`<stage>` is `site` / `construction` / `built`.** Resolve it through
`resolveCivicModel(typeId, stage)` in `apps/web/src/city/civicBuildings.ts`, which is also
where the footprint and the label come from. Never build the string yourself: the resolver
is what fails closed.

**It is not named per type and stage**, which the section below asks for, because it is not
one building's art — it is a **procedural three.js builder for all four types at all three
stages**, a single authoring harness rather than a drawing. Splitting it into twelve files
would mean twelve copies of the same 1,500-line class. The stage words are the source's own
picker: "Cleared ground" → `site`, "Frame up" → `construction`, "Finished" → `built`.

**Regenerating it is one command**, and it has to be, because the art is code:

```sh
node scripts/export-civic-models.mjs           # rewrite all 12 GLBs
node scripts/export-civic-models.mjs --check   # are the tree's bytes reproducible?
```

The builders call `Math.random()` in 76 places, so the exporter replaces it with a
mulberry32 stream seeded per `(type, stage)` from the output filename. `--check --no-seed`
reports all twelve **DIFFERING**, which is what makes a green `--check` mean something.

### Only four of the twelve are committed, and the other eight are not lost

**The eight `site` and `construction` GLBs are deliberately absent from the tree.** A civic
building is **bought, not built through mastery** — no lesson, no CFU, no
`student_node_state` row — so `resolveCivicModel` is only ever asked for `built`, and
committing the early stages cost 2,559,576 bytes of `dist` for stages no code path reaches.
An exporter that emits twelve files where eight are absent is therefore working as designed.

**Nothing is unrecoverable, because the art is code and the code is committed.** One command
brings all twelve back:

```sh
node scripts/export-civic-models.mjs           # writes all 12 into art/models/
```

`--check` proves it without writing to the tree: the four committed files report
**identical**, and the eight absent ones report **absent by design, regenerates to its
pinned digest** against SHA-256s pinned in the exporter. That exemption is asserted both
ways — an "absent" stage that turns up in the tree, or a committed stage that goes missing,
both turn `--check` red — so the list cannot go on excusing an absence that has stopped
existing. `civicBuildings.ts`'s `CIVIC_UNBUNDLED_STAGES` holds the runtime half of the same
decision: an early stage resolves to the shared procedural stand-in, never a silent `null`.

**The art and the authored catalogue disagreed in two places, and one is now settled.** The
2×2 dwelling is still the **Family Lodge** in the art and **The Longhouse** in
`civic-buildings.md` §3 — a label, same building, **open and Evan's**. The 1×1 was the real
one: **The Spring** in the art against a **Storage Pit** in the catalogue, which were
different subjects rather than two names. **Evan ruled for the art on 2026-07-29**, so the
catalogue row, the type id and the filename all moved to the spring and the model did not:
the file is `civic-water-spring-built.glb`, `git mv`'d from `civic-storage-pit-built.glb` and
re-exported, since the exporter seeds from the output name and the bytes are that seed's.
What is left is one word — the catalogue says **The Water Spring** where this source's roster
says **The Spring**, because era three already ships The Bathhouse and all forty civic names
must be unique across the run. The filenames follow the shipped **type id**, because that is
the address the economy holds; `civicBuildings.ts`'s `CIVIC_ART` records both notes and
`civicBuildings.test.ts` fails if that list stops matching the names.

It exists because the two obvious places are both already spoken for.

## Not `art/sources/` — that directory is pinned to exactly two files

`apps/web/src/lessons/cityGuidePreserved.test.tsx` globs `../city/art/sources/*.dc.html`
and asserts **set equality** against `CityGuide.dc.html` and `OruAdvisor.dc.html`. A
third `*.dc.html` dropped in there fails that assertion. The assertion is doing real
work — it is what stops the live advisor's design source and the preserved Oru source
being quietly deleted or stubbed — so it must not be loosened to make room for building
art. Hence a sibling directory rather than a shared one.

Note the glob is non-recursive, so `art/sources/buildings/` would technically dodge it
today. That is exactly the kind of arrangement that breaks the first time someone makes a
glob recursive, which has already been identified as a live hazard for `art/models/`
(see `buildingAssets.ts`). A separate directory cannot be swept in by accident.

## Not `art/models/` — that is the bundled GLB glob

`buildingAssets.ts` does `import.meta.glob("./art/models/*.glb", ["!…/civic-*.glb"])`, and
`buildingAssets.test.ts` pins that to exactly the node-derived basenames — era one's 18 plus
era two's 15, derived from `ERA_SEQUENCE` rather than written as a literal, with the two
halves asserted separately so a total that still adds up cannot hide a swapped set. Anything
here is a design source, never a bundled runtime asset, so it stays out of that tree
entirely.

## Naming

Name a source after the **node** it will render for, matching the GLB naming the engine
derives (`nodeFilePrefix`: lowercase the node id, `.`→`-`), plus the build stage:

```text
exp-1-built.html          RAD.4 → rad-4-site.html
rad-1-construction.html   NUM.S → num-s-built.html
```

The exported GLBs then land in `art/models/` as `exp-1-built.glb` and so on, flat and
un-namespaced. That is safe by construction, not by convention: node ids are the
registry's primary key and their derived basenames are collision-free across all 66 of
them, which `buildingAssets.test.ts` asserts rather than assumes. Do **not** create an
`art/models/d2/` subdirectory — the model glob is non-recursive, so its contents would
silently never load.

**A source that is not one building's art needs a different name, and the civic drop is the
worked example.** Name it for the SET it covers (`civic-era-01-all-stages.dc.html`) and say
so at the top of this file, rather than picking one of the twelve buildings it draws and
implying the other eleven live somewhere else.

**A non-node building class needs a key of its own before it needs a filename.** Civic types
are not graph nodes, so `nodeFilePrefix` has nothing to work from; the civic set answers that
by prefixing the `@cr/game` type id (`civic-water-spring-built.glb`) and paying for the flat
directory with a `!./art/models/civic-*.glb` exclusion on the skill glob, so the skill set's
node-derived count stays exact. Copy that shape rather than inventing a second one: a
subdirectory is invisible to every loader, and making a glob recursive re-opens the
`gridwork-modern/` basename collision.

## O-11 IS ANSWERED, so era two's buildings are authored and drawn

**This section used to say "settle O-11 first".** It is settled: Evan answered it, the era's
two documents carry the ratified names, and
`output/imagegen/era-02-neolithic-building-briefs/README.md` is the authority for all ten
buildings. The mapping the exporter uses, agreed by three independent sources (the art
source's own `_era2Skill()` roster lines, the style guide's roster table, and the brief's
ten-building table):

| Node | Mass | Building | Plot |
| --- | --- | --- | --- |
| `EXP.1` | `store` | the Bee House | 2×1 |
| `RAD.1` | `workshop` | the Potter's Kiln | 2×2 |
| `RAD.2` | `yard` | the Sheep Pen | 2×2 |
| `RAD.3` | `hall` | the Meeting House | 2×2 |
| `RAD.4` | `tower` | the Stone Tower | 2×2 |
| — | `town-hall` | the Elders' Hearth (**hub**, not this lane) | 3×2 |

**Two of those rows moved on 2026-07-30 and their ART SLUGS DID NOT.** Evan withdrew the Seed
House (a raised boarded store on stone stumps) for the Bee House, and the Shrine (a domed clay
oven under a thatch canopy) for the Elders' Hearth, and left `_nDefs().seed` and
`_nDefs().shrine` as the keys. So the slugs in both exporters are stale NAMES for live
entries, and following them is what keeps this tree equal to whatever he next exports —
renaming one would mean editing his source. The re-export landed on 2026-07-31 and moved all
twenty committed era-two GLBs, because the same source revision also re-painted the palette.

The superseded Boomtown Square roster (Kiln Yard / Railhouse / Telegraph Office / Toll Gate /
Boom Hotel) is dead as predicted — a railway and a telegraph are millennia out of period —
and only its through-lines carried over.

**The models are bundled and still unreachable in the city, which is not a bug in this
lane.** `resolveBuildingModel` returns `null` for any node absent from `D1_NODE_BUILDINGS`,
era two's nodes are `product_scope: "target"`, and `CURRENT_ERA_ID` derives from
`ERA_SEQUENCE[0]`, so there is no era-two city to place one in. Naming the buildings in
`eraDressing.ts` is a dressing ruling rather than plumbing and is deliberately not pre-wired
here. Until it lands, the fifteen GLBs can be inspected on the `?three` dev bench, which now
offers era two's five nodes (derived from `ERA_SEQUENCE`, so a node moved between eras
reaches it for free).
