# Era 8–10 Exact-Source Runtime Wiring Design

> **Safety-model revision (2026-08-08):** This isolated, uncommitted worktree creates
> 87 new late-era GLB paths plus one new metadata path; it never overwrites Era 1–7
> assets. The earlier distributed recovery design was disproportionate to
> that scope and blocked implementation. This revision keeps the real guarantees:
> owned staging, fail-closed manifest validation, a short single-writer destination lock,
> manifest-last publication, explicit whitelisted repair, and Git-bound release gates.

**Status:** Approved design, documentation only.

**Decision:** Wire the authored Era 8, Era 9, and Era 10 procedural building
compositions exactly as delivered. The exporter may make representation-preserving
changes required to write static GLB files, but it may not redesign, augment, rotate,
stretch, simplify, or otherwise improve a composition automatically. Toon and object
ordering semantics travel through glTF metadata and are restored on placed/preview
surfaces before render; a temporary PBR transport material is never accepted as their
runtime appearance. The placement ghost remains the explicit exception in §9.3.

**Authored against:** `origin/integration` at
`17b4eba0b66f9ca77e3055bb50a872233acee5f1` on 2026-08-07.

**Forward-port prerequisite:** Era 7 runtime wiring is being integrated separately.
Implementation of this design starts only after that work has landed in
`origin/integration`. The implementation branch must then be rebased or recreated from
the new integration tip and the Era 7 interfaces re-read. This work consumes Era 7's
stage-aware preload and exporter-safety behavior; it does not recreate, copy, or
co-commit Era 7 assets or registrations.

## 1. Goals

1. Preserve one byte-identical repository copy of the approved standalone HTML source.
2. Deterministically export all 87 callable Era 8–10 source states to 87 separately
   addressable GLB files.
3. Register 24 skill buildings, 12 catalogue-backed civic buildings, and three
   era-specific Town Halls without changing their stable runtime identities.
4. Preserve the source's `bare=true` building compositions exactly. Use `bare=false`
   only to compare the omitted diorama setting during review.
5. Preserve source toon gradients, maps, unlit glow, transparency/depth behavior, and
   non-default object render order through a realizable export/load bridge on placed and
   preview surfaces; keep the ghost's deliberate app-state material.
6. Reuse the post-Era 7 stage-aware preload behavior so the runtime fetches only the
   current and reachable future stages.
7. Prove source identity, census, determinism, geometry, material behavior, registry
   population, persistence, spatial fit, whole-city behavior, and performance with
   evidence matched to each claim.
8. Make generation fail closed: validation completes in owned staging before publication;
   an interrupted sequential publication may leave a partial late-era set, while Era 1–7
   bytes remain unchanged.

## 2. Non-goals

- No creative redesign, new concept image, source rewrite, or inferred replacement
  building.
- No automatic composition amendment, best-fit quarter-turn, plot-filling geometry,
  ground pad, extra range, added vehicle, added planting, or exporter-authored prop.
- No runtime footprint change. The existing skill footprints remain `2×2`; civic
  footprints remain the catalogue values; the Town Hall remains `3×2`.
- No rendering of the toon transport as ordinary PBR and no silent material-field
  downgrade when the bridge encounters unsupported semantics.
- No source-material coloration for the placement ghost and no source shadow-bit
  contract; those remain explicit app-level policies in §9.3.
- No decimation, non-uniform scale, height squash, Draco compression, meshopt
  compression, cross-model merge, or cross-stage merge.
- No new runtime dependency and no extraction of a shared exporter core from Era 7 in
  this merge window.
- No change to lesson content, skill-graph membership, costs, capacity values, build
  stages, mastery rules, or era progression.
- No preloading of all late-era assets at application startup.
- No modification of the canonical source to resolve a fit or performance concern.
- No Era 6 or Era 7 asset work. Early Modern remains the one procedural-fallback era;
  Industrial is supplied by its separate prerequisite.

## 3. Exact source authority

### 3.1 Intake identity

The approved intake file is:

- Intake path:
  `/Users/<user>/Downloads/Gridwork Eras - Standalone (4).html`
- Size: `1,928,383` bytes
- SHA-256:
  `6ee885ef8af7b7c9d9b26cf0ec219fa2c7f5fa8a88133794714f49ef8ba37a69`
- Form: self-contained 24-resource procedural Three.js bundle
- Embedded Three.js generation: r128
- Embedded model form: procedural `THREE.Group` builders, not GLB, image, or SVG
  source assets

The one canonical repository copy is:

`apps/web/src/city/art/building-sources/era-08-10-gridwork-all-buildings.dc.html`

There must not be per-era copies of this HTML. The repository copy must remain
byte-identical to the intake file. The exporter verifies its exact byte count and
whole-file digest before extracting or evaluating any resource and before making any
filesystem write.

The whole-file digest is the primary immutable authority. The exporter additionally
asserts that the bundle still has exactly 24 manifest resources and that the selected
resource identities are:

- App Three resource: `b43f7ac9-8d5b-4218-9a75-39aafe705a90`
- Era 8 kit: `8a39b357-c12e-4bc9-a66f-530e5b51718a`
- Era 9 kit: `650d4184-f51f-45f3-a2df-bf92e1ed174e`
- Era 10 kit: `b043418c-5d3e-4532-8068-28fc4155770f`

The decoded kit sizes measured from the approved source are `145,862` bytes for Era 8,
`126,461` bytes for Era 9, and `112,919` bytes for Era 10. These values are validation
facts, not alternative source authorities.

### 3.2 Evaluation boundary and dependency

The exporter does not execute the full standalone viewer. It extracts only the pinned
kit resources after validating the source, supplies the repository's installed Three.js,
`GLTFExporter`, and `BufferGeometryUtils`, and evaluates the kit code in isolated browser
pages with network access disabled.

Era 8 and Era 9 each evaluate in a fresh page. Era 10 resolves `Era9Kit` lazily. Its
resource can be evaluated first and define `Era10Kit`; script-definition order by itself
is not the dependency. The actual contract is use-before-base:

1. Evaluate the pinned Era 10 resource in a realm with no `Era9Kit`.
2. Access or instantiate `Era10Kit` in a way that resolves its base and assert that it
   fails because Era 9 is absent.
3. Evaluate the pinned Era 9 resource in that same realm.
4. Access and instantiate the already-defined `Era10Kit` again and assert that it now
   succeeds.

The exporter may still take the simpler successful path and evaluate Era 9 before Era
10 in its fresh Era 10 page. Tests must prove the lazy use-before-base semantics above,
not merely inspect or reverse script-definition order.

The source viewer's lights are not exported. Its late-era review rig uses a key light and
ambient light unlike the learner runtime, so a standalone viewer screenshot is not
evidence of runtime appearance.

### 3.3 Legacy r128 texture color-space normalization

Raw evaluation against modern Three.js is not faithful by itself. The source assigns:

`texture.encoding = T.sRGBEncoding`

Modern Three r185 has neither an operative `Texture.encoding` property nor an exported
`sRGBEncoding` constant. Without a bridge, the assignment creates an inert legacy-shaped
property while `texture.colorSpace` remains unchanged, silently losing the source's sRGB
intent.

Before evaluating any late-era source resource, each isolated export page installs a
narrow compatibility facade:

1. Wrap the app Three namespace in a page-local mutable facade while preserving the
   original classes/constants by reference.
2. Define one private `LEGACY_SRGB_ENCODING` token and expose it only as
   `T.sRGBEncoding` on that facade.
3. Save any existing `Texture.prototype.encoding` descriptor, then define a configurable
   page-local accessor:
   - setting the exact private token assigns
     `texture.colorSpace = T.SRGBColorSpace`;
   - reading returns the token only when the texture is sRGB-normalized; and
   - setting any other legacy value throws and records the source location/material
     being built.
4. Keep the accessor active through source evaluation, lazy builder execution, metadata
   capture, and source-reference rendering.
5. In `finally`, restore the prior descriptor/facade and close the isolated page. No
   prototype or namespace mutation reaches another page, Node, or the app runtime.

The exporter asserts that every source legacy encoding assignment uses the one supported
token. No unsupported r128 encoding value is ignored or guessed.

Metadata capture happens after this normalization. Texture role is explicit:

- base-color and other color-bearing maps marked by the source legacy assignment record
  and restore `SRGBColorSpace`;
- toon gradient, scalar, mask, normal, and other non-color data textures retain
  `NoColorSpace` or their separately authored non-color space; and
- no rule marks every texture sRGB merely because it is an image.

Tests prove:

1. modern raw evaluation without the accessor is red: a legacy assignment leaves
   `colorSpace` wrong;
2. bridge evaluation is green: the assignment produces `SRGBColorSpace` and no inert own
   `encoding` property;
3. an injected unsupported legacy encoding fails by name;
4. captured base-map metadata is sRGB while gradient/non-color metadata is not;
5. `GLTFLoader` plus the runtime adapter preserves the intended slot color spaces; and
6. source-reference versus restored-runtime pixels meet §6.5 only when both sides use
   the normalized interpretation.

## 4. Exact census and runtime inventory

### 4.1 Census arithmetic

The source exposes exactly 39 definitions and 87 callable states:

- Era 8: 14 definitions = 9 skills + 4 civics + 1 Town Hall.
  `9 × 3 + 4 × 1 + 1 × 1 = 32` GLBs.
- Era 9: 11 definitions = 6 skills + 4 civics + 1 Town Hall.
  `6 × 3 + 4 × 1 + 1 × 1 = 23` GLBs.
- Era 10: 14 definitions = 9 skills + 4 civics + 1 Town Hall.
  `9 × 3 + 4 × 1 + 1 × 1 = 32` GLBs.
- Total: `14 + 11 + 14 = 39` definitions and
  `32 + 23 + 32 = 87` GLBs.
- Category total: `24 × 3 = 72` skill GLBs, `12` civic built GLBs, and
  `3` Town Hall built GLBs.

`site`, `construction`, and `built` are three separate authored source states. Runtime
`advanced` reuses `built` and does not create an 88th model.

Brace notation in the inventory below names exactly the three listed basenames. For
example, `fun-4-{site,construction,built}.glb` means
`fun-4-site.glb`, `fun-4-construction.glb`, and `fun-4-built.glb`.

### 4.2 Source roster contract

The exact source roster order is:

- Era 8:
  `weather`, `exchange`, `radio`, `tunnel`, `housing`, `electronics`,
  `nuclear`, `power`, `cooling`, `supermarket`, `apartment`, `pool`,
  `firestation`, `townhall`
- Era 9:
  `datacentre`, `officetower`, `chipfab`, `researchlab`, `glassapts`,
  `airbase`, `distribution`, `condominium`, `roofgarden`, `hospital`,
  `headquarters`
- Era 10:
  `neonplaza`, `dronecommand`, `hologram`, `signaltower`, `datavault`,
  `broadcast`, `robotics`, `exchange`, `quantum`, `vertfarm`, `pods`,
  `nightmarket`, `nightclub`, `steamvent`

The exact source `builtOnly()` sets are:

- Era 8:
  `supermarket`, `apartment`, `pool`, `firestation`, `townhall`
- Era 9:
  `distribution`, `condominium`, `roofgarden`, `hospital`, `headquarters`
- Era 10:
  `vertfarm`, `pods`, `nightmarket`, `nightclub`, `steamvent`

Every definition outside those sets owes all three skill stages. Every definition inside
those sets owes exactly one `built` state. A source key moving between the sets is a
contract failure, not permission to change the output plan.

Every source `roster()` row has six fields:
`[definition, tab, title, target, footprint, ordinal]`. The two learner-readable source
fields are distinct: `tab` is the short picker label and `title` is the dressed source
label. The inventories below transcribe both verbatim. Product runtime copy remains a
separate column and may intentionally differ from either source field. The `#` column
is one-based for readers; the raw source `ordinal` is exactly `# - 1`, is asserted as
such, and remains a separate zero-based field in the exporter plan and metadata.

### 4.3 Era 8 — Atomic Age

The rows are in exact source roster order.

| # | Source definition; raw `tab`; raw `title` | Exact runtime binding | Principal authored plan | Source plot → runtime plot | Shipping contract |
| ---: | --- | --- | --- | --- | --- |
| 1 | `weather`; `Weather`; `the Weather Office` | skill node and lesson `FUN.4`; `Assembly Hall, the Weather Office` | `19×9.4` | `3×2 → 2×2` | 3: `fun-4-{site,construction,built}.glb` |
| 2 | `exchange`; `Exchange`; `the Telephone Exchange` | skill node and lesson `LF.1`; `Assembly Hall, the Telephone Exchange` | `21×12` | `3×2 → 2×2` | 3: `lf-1-{site,construction,built}.glb` |
| 3 | `radio`; `Radio`; `the Radio Workshop` | skill node and lesson `FUN.6`; `Store, the Radio Workshop` | `14×10` | `2×2 → 2×2` | 3: `fun-6-{site,construction,built}.glb` |
| 4 | `tunnel`; `Wind Tunnel`; `the Wind Tunnel` | skill node and lesson `FUN.5`; `Workshop, the Wind Tunnel` | `24×9` | `3×2 → 2×2` | 3: `fun-5-{site,construction,built}.glb` |
| 5 | `housing`; `Housing`; `the Housing Blocks` | skill node and lesson `FUN.9`; `Dwellings, the Housing Blocks` | `26×11` | `3×2 → 2×2` | 3: `fun-9-{site,construction,built}.glb` |
| 6 | `electronics`; `Electronics`; `the Electronics Works` | skill node and lesson `LF.2`; `Workshop, the Electronics Works` | `27×14` | `3×2 → 2×2` | 3: `lf-2-{site,construction,built}.glb` |
| 7 | `nuclear`; `Nuclear`; `the Nuclear Weapons Facility` | skill node and lesson `LF.3`; `Store, the Nuclear Weapons Facility` | `21×16` plus transfer bay | `3×3 → 2×2` | 3: `lf-3-{site,construction,built}.glb` |
| 8 | `power`; `Power`; `the Power Station` | skill node and lesson `FUN.10`; `Commons, the Power Station` | `28×12` turbine hall plus `26×9` boiler house | `3×3 → 2×2` | 3: `fun-10-{site,construction,built}.glb` |
| 9 | `cooling`; `Cooling`; `the Cooling Tower` | skill node and lesson `LF.4`; `Tower, the Cooling Tower` | `Ø17.2`, height `26` | `2×2 → 2×2` | 3: `lf-4-{site,construction,built}.glb` |
| 10 | `supermarket`; `Supermarket`; `the Supermarket` | catalogue/model type `atomic_age_supermarket`; `The Supermarket` | `26×15` | `3×2 → 2×2` | 1: `civic-atomic-age-supermarket-built.glb` |
| 11 | `apartment`; `Apartments`; `the Apartment Tower` | catalogue/model type `atomic_age_apartment_tower`; `The Apartment Tower` | `12×12` plus service core | `2×2 → 1×1` | 1: `civic-atomic-age-apartment-tower-built.glb` |
| 12 | `pool`; `Pool`; `the Swimming Pool` | catalogue/model type `atomic_age_swimming_pool`; `The Swimming Pool` | `26×15` | `3×2 → 3×2` | 1: `civic-atomic-age-swimming-pool-built.glb` |
| 13 | `firestation`; `Fire Station`; `the Fire Station` | catalogue/model type `atomic_age_community_centre`; `The Fire Station` | `22×12` plus hose tower | `3×2 → 2×1` | 1: `civic-atomic-age-community-centre-built.glb` |
| 14 | `townhall`; `Town Hall`; `the Town Hall & Heating Plant` | `TOWN_HALL_ID = "town-hall"` and era `atomic_age`; `Civic Center, the Heating Plant` | `30×13` frontage plus `20×12` boiler range | `3×3 → 3×2` | 1: `townhall-atomic-age-built.glb` |

Era 8 total: 9 three-stage skills (`27`) + 4 built civics + 1 built hall =
`32`.

### 4.4 Era 9 — Information Age

The rows are in exact source roster order.

| # | Source definition; raw `tab`; raw `title` | Exact runtime binding | Principal authored plan | Source plot → runtime plot | Shipping contract |
| ---: | --- | --- | --- | --- | --- |
| 1 | `datacentre`; `Data Centre`; `the Data Centre` | skill node and lesson `EL.1`; `Assembly Hall, the Data Centre` | `26×15` | `3×2 → 2×2` | 3: `el-1-{site,construction,built}.glb` |
| 2 | `officetower`; `Office Tower`; `the Office Tower` | skill node and lesson `EL.2`; `Tower, the Office Tower` | `18×15` plus core | `2×2 → 2×2` | 3: `el-2-{site,construction,built}.glb` |
| 3 | `chipfab`; `Chip Factory`; `the Chip Factory` | skill node and lesson `EL.3`; `Workshop, the Chip Factory` | `32×22` plus office | `3×3 → 2×2` | 3: `el-3-{site,construction,built}.glb` |
| 4 | `researchlab`; `Research Lab`; `the Research Lab` | skill node and lesson `EL.4`; `Store, the Research Lab` | two `11×25` wings | `3×2 → 2×2` | 3: `el-4-{site,construction,built}.glb` |
| 5 | `glassapts`; `Glass Apartments`; `the Glass Apartments` | skill node and lesson `EL.5`; `Dwellings, the Glass Apartments` | `30×14` | `3×2 → 2×2` | 3: `el-5-{site,construction,built}.glb` |
| 6 | `airbase`; `Air Force Base`; `the Air Force Base` | skill node and lesson `EL.6`; `Commons, the Air Force Base` | `34×22` | `3×3 → 2×2` | 3: `el-6-{site,construction,built}.glb` |
| 7 | `distribution`; `Distribution`; `the Distribution Centre` | catalogue/model type `information_age_food_warehouse`; `The Distribution Center` | `40×24` | `3×3 → 2×2` | 1: `civic-information-age-food-warehouse-built.glb` |
| 8 | `condominium`; `Condominium`; `the Condominium` | catalogue/model type `information_age_residential_tower`; `The Condominium` | `15×15` | `2×2 → 1×1` | 1: `civic-information-age-residential-tower-built.glb` |
| 9 | `roofgarden`; `Roof Garden`; `the Roof Garden` | catalogue/model type `information_age_park`; `The Roof Garden` | `36×28` | `3×3 → 3×2` | 1: `civic-information-age-park-built.glb` |
| 10 | `hospital`; `Hospital`; `the Hospital` | catalogue/model type `information_age_clinic`; `The Hospital` | `36×13` plus two `12×15` wings | `3×3 → 1×2` | 1: `civic-information-age-clinic-built.glb` |
| 11 | `headquarters`; `Headquarters`; `the Headquarters` | `TOWN_HALL_ID = "town-hall"` and era `information_age`; `Civic Center, the Headquarters` | `17×16` tower plus two `15×20` wings | `3×3 → 3×2` | 1: `townhall-information-age-built.glb` |

Era 9 total: 6 three-stage skills (`18`) + 4 built civics + 1 built hall =
`23`.

### 4.5 Era 10 — Cyberpunk Era

The rows are in exact source roster order.

| # | Source definition; raw `tab`; raw `title` | Exact runtime binding | Principal authored plan | Source plot → runtime plot | Shipping contract |
| ---: | --- | --- | --- | --- | --- |
| 1 | `neonplaza`; `Neon Plaza`; `the Neon Plaza` | skill node and lesson `TRG.1`; `Commons, the Neon Plaza` | `32×28` | `3×3 → 2×2` | 3: `trg-1-{site,construction,built}.glb` |
| 2 | `dronecommand`; `Drone Command`; `the Drone Command` | skill node and lesson `TRG.2`; `Workshop, Drone Command` | `28×18` | `3×2 → 2×2` | 3: `trg-2-{site,construction,built}.glb` |
| 3 | `hologram`; `Hologram Theatre`; `the Hologram Theatre` | skill node and lesson `TRG.3`; `Assembly Hall, the Hologram Theatre` | `30×21` | `3×2 → 2×2` | 3: `trg-3-{site,construction,built}.glb` |
| 4 | `signaltower`; `Signal Tower`; `the Signal Tower` | skill node and lesson `TRG.4`; `Tower, the Signal Tower` | `18×18`, mast height `27` | `2×2 → 2×2` | 3: `trg-4-{site,construction,built}.glb` |
| 5 | `datavault`; `Data Vault`; `the Data Vault` | skill node and lesson `TRG.5`; `Store, the Data Vault` | `30×16` | `3×2 → 2×2` | 3: `trg-5-{site,construction,built}.glb` |
| 6 | `broadcast`; `Broadcast Tower`; `the Broadcast Tower` | skill node and lesson `TRG.6`; `Tower, the Broadcast Tower` | `30×26`, shaft height `24` | `3×3 → 2×2` | 3: `trg-6-{site,construction,built}.glb` |
| 7 | `robotics`; `Robotics Lab`; `the Robotics Lab` | skill node and lesson `TRG.7`; `Workshop, the Robotics Lab` | `30×18` | `3×2 → 2×2` | 3: `trg-7-{site,construction,built}.glb` |
| 8 | `exchange`; `Stock Exchange`; `the Stock Exchange` | skill node and lesson `TRG.8`; `Assembly Hall, the Stock Exchange` | `32×26` plus `20×18×26` tower | `3×3 → 2×2` | 3: `trg-8-{site,construction,built}.glb` |
| 9 | `quantum`; `Quantum Core`; `the Quantum Core` | skill node and lesson `TRG.9`; `Dwellings, the Quantum Core` | `20×15` | `3×3 → 2×2` | 3: `trg-9-{site,construction,built}.glb` |
| 10 | `vertfarm`; `Vertical Farm`; `the Vertical Farm` | catalogue/model type `cyberpunk_vertical_farm`; `The Vertical Farm` | `15×13` | `2×2 → 1×1` | 1: `civic-cyberpunk-vertical-farm-built.glb` |
| 11 | `pods`; `Pod Apartments`; `the Pod Apartments` | catalogue/model type `cyberpunk_capsule_homes`; `The Pod Apartments` | `15×12` | `2×2 → 1×1` | 1: `civic-cyberpunk-capsule-homes-built.glb` |
| 12 | `nightmarket`; `Night Market`; `the Night Market` | catalogue/model type `cyberpunk_night_market`; `The Night Market` | `34×30` | `3×3 → 3×2` | 1: `civic-cyberpunk-night-market-built.glb` |
| 13 | `nightclub`; `Nightclub`; `the Nightclub` | catalogue/model type `cyberpunk_station`; `The Nightclub` | `28×20`, recessed `3.2` | `3×2 → 2×2` | 1: `civic-cyberpunk-station-built.glb` |
| 14 | `steamvent`; `Town Hall`; `the Steam Vent` | `TOWN_HALL_ID = "town-hall"` and era `cyberpunk`; `Civic Center, the Steam Vent` | `46×46`, stack height `30` | `4×4 → 3×2` | 1: `townhall-cyberpunk-built.glb` |

Era 10 total: 9 three-stage skills (`27`) + 4 built civics + 1 built hall =
`32`.

### 4.6 Identity rules

The source's skill `target` values are the exact lesson/node ids shown above. The raw
source target for all 12 civics and all three Town Halls is only `civic`; it is not a
usable runtime identity. Those 15 mappings are explicit data and may not be inferred
from labels, method names, positions, or roster order.

Skill filenames derive only from `nodeFilePrefix(nodeId)`: lowercase and replace `.`
with `-`. Civic filenames derive only from `civicModelBasename(modelType, "built")`:
prefix `civic-`, replace `_` with `-`, and append `-built.glb`. Late-era civic
`modelType` is exactly the stable catalogue id. Town Hall filenames are explicit
per-era entries in `TOWN_HALL_ERA_MODELS`.

Display copy never becomes persistence identity. The following apparently mismatched
bindings are intentional and must remain:

- `atomic_age_community_centre` displays as `The Fire Station`.
- `information_age_food_warehouse` displays as `The Distribution Center`.
- `information_age_residential_tower` displays as `The Condominium`.
- `information_age_park` displays as `The Roof Garden`.
- `information_age_clinic` displays as `The Hospital`.
- `cyberpunk_capsule_homes` displays as `The Pod Apartments`.
- `cyberpunk_station` displays as `The Nightclub`.

Canonical late-era placement ids remain
`civic:<catalogue-id>:<non-negative-sequence>`, such as
`civic:cyberpunk_station:12`. No migration or alias is introduced.

## 5. Source quirks and composition policy

### 5.1 Labels that must not be normalized

- The source's raw `distribution` row is
  `tab = "Distribution"` / `title = "the Distribution Centre"`; the catalogue
  deliberately uses American `The Distribution Center`.
- The source's raw `apartment` row is
  `tab = "Apartments"` / `title = "the Apartment Tower"`. Neither field is the mixed
  normalized label `Apartment Tower`.
- The source's raw `dronecommand` row is
  `tab = "Drone Command"` / `title = "the Drone Command"`. Product copy deliberately
  differs: `Drone Command` is the run's one ratified skill subtitle without a leading
  article, so runtime renders `Workshop, Drone Command`, not
  `Workshop, the Drone Command`.
- The Atomic source's raw Town Hall row is
  `tab = "Town Hall"` / `title = "the Town Hall & Heating Plant"`; runtime copy is the
  stable hub plus its ratified subtitle:
  `Civic Center, the Heating Plant`.
- Era 9's raw hub is
  `tab = "Headquarters"` / `title = "the Headquarters"`; runtime is
  `Civic Center, the Headquarters`.
- Era 10's raw hub is
  `tab = "Town Hall"` / `title = "the Steam Vent"`; runtime is
  `Civic Center, the Steam Vent`.
- Art keys such as `community_centre`, `food_warehouse`, `clinic`, and `station` are
  stable addresses even where the display label later changed.

The implementation preserves both raw roster fields in the export plan and metadata,
then transcribes product copy from the ratified subtitle rows. It does not substitute a
source `tab` for a source `title`, normalize either field, or use either as product copy
where the runtime binding explicitly differs.

### 5.2 `bare` modes

Each kit defaults to `bare=true`, meaning the delivered building without the optional
ground pad, surrounding apron, water, planting, vehicles, or loose setting supplied by
the standalone diorama. Production explicitly asserts that the default remains true
and exports with `bare=true`.

`bare=false` is comparison-only:

- It requires an explicit output directory physically outside the production model
  tree.
- It is never registered, promoted, committed as runtime art, counted in the 87-file
  shipping census, or included in shipping metadata.
- It uses the same per-basename seed as `bare=true`, so visual differences reflect the
  composition branch rather than a different random stream.
- It may inform a later request for a named amendment, but it cannot authorize one.

### 5.3 No universal fill floor

The source footprints and runtime footprints intentionally differ, as the inventory
records. An exploratory contain-fit measurement found that an Era 7-style `0.72`
two-axis fill floor would reject 53 of the 87 exact source groups even after choosing
the better quarter-turn:

- Era 8: `23/32`
- Era 9: `11/23`
- Era 10: `19/32`

Those results are primarily deliberate long plans, towers, cranes, open ground, and
source/runtime plot differences. A universal floor would force creative composition
changes and contradict the approved exact-source decision.

The hard automated fit requirements are therefore:

1. Bounds are finite and non-empty.
2. The existing runtime uniform contain-fit keeps each model inside its exact runtime
   footprint.
3. The exporter does not rotate, re-center, ground, rescale, or augment the source
   group before export.
4. Runtime grounding and X/Z centering may translate the loaded object, and the
   existing uniform contain-fit may scale it as a whole. Those operations preserve
   proportions and are the placement contract for every era.
5. The runtime `MAX_BUILD_HEIGHT` non-uniform Y cap must not activate for any of these
   87 prepared models. Activation is a validation failure because it would stretch the
   approved source composition.
6. Measured fill ratios and prepared bounds are recorded as drift baselines, not judged
   against one universal minimum.
7. Every state receives rendered plot-fit review.

There is no composition amendment in this design. Any later amendment requires a new,
named user approval that identifies the exact era, source key, affected stages, proposed
change, and reason. General permission to improve fit or performance is insufficient.
An approved amendment remains explicit, source-keyed data and is tested in both
directions: it fails if it no longer affects its named qualifier, and an unlisted output
may not be changed.

## 6. Exporter design

### 6.1 One data-driven exporter

Add one exporter:

`scripts/export-era8-10-building-models.mjs`

It owns three immutable era plans. Each plan contains the source resource id, kit name,
evaluation prerequisites, exact roster order, exact `builtOnly()` set, and all six raw
roster fields (`definition`, `tab`, `title`, `target`, `footprint`, `ordinal`), followed
by kind, runtime identity, runtime footprint, stage list, output directory, and output
basename. The 39-row plan is the executable form of the inventory in §4.

The exporter derives jobs from those rows and refuses:

- any definition count other than `14/11/14`;
- any output count other than `32/23/32`;
- any total other than 39 definitions and 87 unique basenames;
- any source roster or `builtOnly()` set that differs in membership or order;
- duplicate source keys within an era;
- duplicate runtime targets;
- duplicate output paths;
- a skill target outside the exact era membership in `ERA_SEQUENCE`;
- a civic target outside that era's exact four catalogue rows; or
- a Town Hall target other than the stable `town-hall` sentinel plus its exact era id.

The plans do not infer mappings from the source `civic` label.

### 6.2 Command modes

- No flags: deterministic `bare=true` generation in an owned stage root, full validation,
  short destination lock, 87 GLB promotion, then metadata last.
- `--check`: deterministic `bare=true` staging in owned scratch, then read-only manifest/hash
  comparison with production.
- `--out <non-existent-child>`: create an invocation-owned parent with `mkdtemp`, then pass a
  non-existent child destination to the exporter; it creates and owns that child. It performs
  deterministic `bare=true` output only and never writes production.
- `--comparison`: deterministic `bare=false` scratch-only comparison; it has no caller-retained
  output, shipping metadata, destination lock, or production write.
- `--check --no-seed`: seeded versus unseeded probe entirely inside owned scratch.
- `--repair-incomplete-late-era-output`: refuses while locked, removes only the fixed late-era
  whitelist and nonce-owned siblings, regenerates, validates, and publishes metadata last.

Unknown/duplicate/contradictory flags and unsafe paths fail before writes. Check/no-seed neither
creates production-side temporary files nor changes production bytes.

### 6.3 Deterministic per-basename randomness

The kits use `Math.random` directly: 21 sites in Era 8, 29 in Era 9, and 5 in Era 10,
with Era 10 also inheriting Era 9 behavior. Randomness is part of the authored
composition and must be preserved deterministically.

For each output:

1. Use the basename without `.glb` as the complete seed input, for example
   `trg-6-construction`.
2. Hash that string with 32-bit FNV-1a.
3. Feed the result to the established mulberry32 generator.
4. Install the generator as `Math.random` only for one fresh kit instance and one
   source build.
5. Restore the real `Math.random` in `finally`.

There is no run-global random stream. Reordering jobs or adding a future job therefore
cannot change an existing model. Two complete runs, a reversed job-order run, and a
reversed asynchronous image-completion run must reproduce the same 87 SHA-256 digests.

The no-seed probe establishes the partition from complete GLB behavior, including transported
image bytes. On the canonical source, every one of the 87 outputs varies: fresh kit construction
randomizes base-map texels even when a definition builder does not call `Math.random` itself.
The exact seed-independent set is therefore empty, while the random-dependent population is
exactly `32/23/32`. The guard asserts both sets and their union directly; it must fail when a
varying output is falsely classified as independent, when any output is omitted from the
random-dependent population, or when members are substituted between eras. A future genuinely
seed-independent output requires a named, reasoned contract change rather than an inferred
exception added merely to satisfy a test.

### 6.4 Representation-preserving geometry

For each source group and stage:

1. Update world matrices.
2. Clone each returned visible mesh geometry.
3. Bake that mesh's complete `matrixWorld` into its geometry clone.
4. Preserve the source coordinates, orientation, scale, material assignment, UVs,
   normals, vertex colors, draw side, alpha behavior, and texture identity.
5. Export an identity-root static group.

glTF does not carry Three.js cast/receive-shadow bits, and this design does not invent a
shadow metadata contract. Placed and ghost shadows are explicit app policies in §9.3,
separate from source geometry/material preservation.

Static meshes may merge only within that one output and only when all of these are
identical:

- source material identity and complete serialized material signature;
- indexed versus non-indexed form;
- attribute names;
- each attribute's item size, normalized flag, typed-array constructor, and usage;
- morph-attribute absence;
- exact object `renderOrder`; and
- opaque ordering semantics.

Transparent meshes remain separate because merging can change draw order. A failed
signature check leaves meshes separate; it never coerces one mesh to another signature.
Meshes with different `renderOrder` values never merge. Meshes with the same non-default
order may merge only if every other signature field matches, and the merged node keeps
that order in semantic metadata. No merge crosses a source definition, stage, runtime
target, material identity, or GLB.

The exporter must not:

- add or remove source meshes by semantic label;
- perform a fit quarter-turn;
- add a pad, apron, extension, prop, or repeated range;
- decimate geometry;
- stretch any axis;
- collapse distinct materials;
- combine models;
- use Draco or meshopt; or
- emit external texture dependencies.

### 6.5 Exact-source material and render-order bridge

Source inspection found that the late-era material helpers construct ordinary building
surfaces with `MeshToonMaterial` and `_grad()` supplies a `3×1` RGBA
`CanvasTexture`, construct glow surfaces with `MeshBasicMaterial`, and assign
non-default object order in at least the Cyberpunk Vertical Farm clear panes
(`renderOrder = 3`). Era 9 and inherited Era 10 base maps also request
`anisotropy = 8`, a sampler property glTF does not carry. All texture inspection in
this section occurs after §3.3's r128 color-space normalization; unbridged modern
evaluation is not a reference.

Plain `GLTFExporter` is not the fidelity contract. It accepts `MeshToonMaterial` only by
warning and serializing the subset glTF PBR happens to understand; glTF has no core toon
material or `Object3D.renderOrder` field. Shipping those bytes directly and promising
toon fidelity would be impossible.

The installed Three.js exporter and loader make a concrete bridge possible:

- `GLTFExporter.serializeUserData` writes JSON-safe material and node `userData` to
  standard glTF `extras`;
- `GLTFLoader.assignExtrasToUserData` restores material and node `extras` to
  `userData`; and
- `MeshBasicMaterial` is exported with `KHR_materials_unlit`.

The bridge uses those supported paths rather than a renderer fork or an unsupported
custom shader extension.

#### Export-side semantic capture

After geometry batching and before `GLTFExporter`:

1. Tag the export scene with `userData.gridworkLateEraAsset`, containing schema `1`,
   the source SHA-256, era, source key, stage, and output basename. This is the narrow
   runtime adapter gate.
2. Walk each unique original source material instance by object identity after the
   source group is built under the legacy color-space bridge. Record normalized
   effective instance values, not constructor text or inert legacy properties.
   Create exactly one glTF-compatible transport material for that original and reuse it
   on every mesh that shared the source material.
3. For `MeshToonMaterial`, use an ephemeral `MeshStandardMaterial` transport with
   `roughness = 1` and `metalness = 0`, preserving the glTF-compatible base color,
   base-color map, opacity/alpha mode, and side. Put the complete toon reconstruction
   record in `transport.userData.gridworkMaterial`, so it becomes material `extras`.
4. The toon record contains schema `1`, `kind = "toon"`, a deterministic
   output-local source-material key, and the source values for:
   `color`, `opacity`, `transparent`, `alphaTest`, `side`, `depthTest`, `depthWrite`,
   `depthFunc`, `colorWrite`, `blending`, `blendSrc`, `blendDst`, `blendEquation`,
   `blendSrcAlpha`, `blendDstAlpha`, `blendEquationAlpha`, `premultipliedAlpha`,
   `forceSinglePass`, `polygonOffset`, `polygonOffsetFactor`, `polygonOffsetUnits`,
   `toneMapped`, `dithering`, `flatShading`, `vertexColors`, and `fog`.
5. When the material has a source base `map`, keep that texture in the transport's glTF
   base-color slot and record a complete `baseMap` sampler/transform record:
   offset, repeat, center, rotation, the full 3×3 texture matrix,
   `matrixAutoUpdate`, wrap modes, min/mag filters, requested anisotropy,
   `generateMipmaps`, `flipY`, `premultiplyAlpha`,
   `unpackAlignment`, and color space. A null source map records `baseMap = null`.
   Export fails if a map-bearing source material loses its glTF texture or transform.
6. Serialize the actual three-band toon gradient, not a name for it. Read the source
   canvas pixels and store all three RGBA texels in left-to-right order: twelve
   unsigned-byte channel values, dimensions `3×1`, `RGBA8_UNORM` channel
   interpretation, source object type `CanvasTexture`, format/type, min/mag filters,
   wrap modes, color space, `generateMipmaps`, `flipY`, `premultiplyAlpha`, and
   `unpackAlignment`. It does not collapse RGBA to one channel or substitute guessed
   bands.
7. For source `MeshBasicMaterial` glow surfaces, keep a `MeshBasicMaterial` transport
   so `GLTFExporter` emits `KHR_materials_unlit`. Add
   `gridworkMaterial.kind = "unlit"` with the same non-core depth, blending, alpha,
   tone-mapping, and polygon-offset fields so loader defaults cannot alter them.
8. If a source material has a non-default render-affecting field outside the schema
   above, export fails naming the material and field. Unsupported semantics are never
   ignored or silently downgraded.
9. For every object whose source `renderOrder !== 0`, set
   `userData.gridworkRenderOrder` to that integer before export. `renderOrder = 0`
   remains the documented default and needs no extra. The Cyberpunk Vertical Farm's
   clear façade panes are a named required case: their source order `3` must appear in
   node extras.

Base-map fields use an explicit behavior bridge:

- image and UV offset/repeat/center/rotation travel through glTF base color plus
  `KHR_texture_transform`;
- wrap and min/mag filtering travel through the glTF sampler;
- requested anisotropy is omitted by glTF and is restored from extras;
- `generateMipmaps`, `flipY`, `premultiplyAlpha`, `unpackAlignment`, and color space are
  recorded from source and checked against the export/load representation.

The last group is render behavior, not a promise of equal JavaScript property values.
For example, when `GLTFExporter` bakes a source `flipY` into exported pixels and
`GLTFLoader` correctly returns `flipY = false`, the adapter keeps that loaded effective
state rather than flipping a second time. A per-field bridge test proves the loaded
texture samples the same UV/color as source. Any field that is neither represented by
glTF nor applied by the adapter fails export.

The JSON-safe extras contract is:

```ts
type GridworkLateEraAssetExtras = {
  schema: 1;
  sourceSha256: string;
  era: "atomic_age" | "information_age" | "cyberpunk";
  sourceKey: string;
  stage: "site" | "construction" | "built";
  basename: string;
};

type GridworkBaseMapExtras = {
  slot: "baseColor";
  offset: readonly [number, number];
  repeat: readonly [number, number];
  center: readonly [number, number];
  rotation: number;
  matrix: readonly [number, number, number, number, number, number, number, number, number];
  matrixAutoUpdate: boolean;
  wrapS: string;
  wrapT: string;
  minFilter: string;
  magFilter: string;
  anisotropyRequested: number;
  generateMipmaps: boolean;
  flipY: boolean;
  premultiplyAlpha: boolean;
  unpackAlignment: number;
  colorSpace: string;
};

type GridworkMaterialExtras = {
  schema: 1;
  kind: "toon" | "unlit";
  sourceMaterialKey: string;
  color: readonly [number, number, number];
  baseMap: GridworkBaseMapExtras | null;
  gradient:
    | {
        width: 3;
        height: 1;
        channels: 4;
        channelInterpretation: "RGBA8_UNORM";
        texels: readonly [
          readonly [number, number, number, number],
          readonly [number, number, number, number],
          readonly [number, number, number, number],
        ];
        sourceObjectType: "CanvasTexture";
        runtimeObjectType: "DataTexture";
        format: string;
        type: string;
        minFilter: string;
        magFilter: string;
        wrapS: string;
        wrapT: string;
        generateMipmaps: boolean;
        flipY: boolean;
        premultiplyAlpha: boolean;
        unpackAlignment: number;
        colorSpace: string;
      }
    | null;
  render: {
    opacity: number;
    transparent: boolean;
    alphaTest: number;
    side: string;
    depthTest: boolean;
    depthWrite: boolean;
    depthFunc: string;
    colorWrite: boolean;
    blending: string;
    blendSrc: string;
    blendDst: string;
    blendEquation: string;
    blendSrcAlpha: string | null;
    blendDstAlpha: string | null;
    blendEquationAlpha: string | null;
    premultipliedAlpha: boolean;
    forceSinglePass: boolean;
    polygonOffset: boolean;
    polygonOffsetFactor: number;
    polygonOffsetUnits: number;
    toneMapped: boolean;
    dithering: boolean;
    flatShading: boolean;
    vertexColors: boolean;
    fog: boolean;
  };
};
```

For `kind = "toon"`, `gradient` is required and exact. For `kind = "unlit"`,
`gradient` is `null`. Enum-valued fields use audited Three.js constant names rather than
unstable numeric values; the adapter accepts only the names the exporter schema
declares. `color` is the effective material RGB tuple in the export build's working
color space after the source constructor has run. Node extras are
`{ gridworkRenderOrder: integer }`.

Runtime reconstructs the recorded gradient as an RGBA `DataTexture`, not as a
`CanvasTexture`. This is a deliberate render-equivalent conversion: the toon shader
samples the same `3×1` RGBA texels with the same sampler and color-space settings, but
the JavaScript texture class is intentionally different. The specification claims
render equivalence and recorded-value equality, never object-type identity.

The source materials themselves are not rewritten. Surrogates exist only on the
ephemeral export group. The exporter still uses the repository's color-management
compatibility handling so colors are converted exactly once and restores global state
after every build.

#### Runtime restoration adapter

Add a narrowly scoped adapter at:

`apps/web/src/city/three/lateEraGridworkMaterial.ts`

It runs only when the loaded scene carries a valid
`gridworkLateEraAsset.schema === 1` tag. Untagged earlier-era, procedural, ruin, road,
and crisis assets continue through their existing material path unchanged.

For a tagged prepared clone, the adapter:

1. Validates every material record before replacing anything. Missing, malformed, or
   unknown schema data is a named hard failure; the transport PBR material is never
   accepted as a visual fallback.
2. Maps each unique loaded transport material to exactly one restored material for that
   prepared clone. Every mesh that shared one source material shares one restored
   material.
3. Reconstructs `MeshToonMaterial` from the recorded fields, reusing the loaded glTF
   base-color `map` and a cached RGBA `DataTexture` gradient, then marks the
   reconstructed material for its one pre-render update.
4. Keys the immutable gradient cache on the complete gradient record. Materials and
   models with identical twelve RGBA component values and texture settings share one
   gradient texture; different records cannot alias. A newly created gradient is marked
   for one upload. An individual model does not dispose a shared gradient.
5. Validates every base-map transform and sampler field, restores fields glTF omits,
   and preserves render-equivalent loader state where export baked the source behavior.
   The loaded glTF texture supplies the source image; a cache keyed by loaded texture
   identity plus the complete `baseMap` record prevents conflicting sampler records
   from mutating one another and avoids per-instance clones when records agree.
6. Restores `texture.anisotropy` to the source-requested value, including `8` for Era 9
   and Era 10. It does not pre-clamp the property. Three.js applies
   `min(texture.anisotropy, renderer.capabilities.getMaxAnisotropy())` when uploading to
   a renderer, so one shared texture can retain request `8` while rendering at effective
   `1`, `4`, or `8` on devices whose maxima are `1`, `4`, or at least `8`.
7. Leaves `KHR_materials_unlit` materials as `MeshBasicMaterial` and restores their
   recorded depth, blending, alpha, side, tone-mapping, and polygon-offset fields.
8. Restores each integer `gridworkRenderOrder` onto its object before first render.
9. Marks the prepared clone restored so a repeated call is idempotent and returns the
   same material and gradient objects.

`prepareModel` invokes this adapter on the cloned object before its ordinary
non-Gridwork material revival. Tagged materials bypass `reviveMaterial`; otherwise that
function would clone them per mesh and destroy source sharing. Exact material
restoration is shared by `BuildingThumb`, `GridworkModelPreview`, and the Town Hall's
`PlacedModelStack`, so placed and preview surfaces cannot render different shaders from
the same GLB. `GhostBuilding` restores node metadata/order only, then deliberately
applies the app's ghost material policy in §9.3.

Restoration occurs inside existing `useMemo` preparation keyed by the loaded scene and
presentation state. No adapter work, material clone, or `DataTexture` allocation occurs
in `useFrame` or another per-frame path.

#### Material and render-order proof

Tests must prove all six layers:

1. **Raw GLB semantics:** parse GLB JSON without loading it and assert every source toon
   material has the complete `gridworkMaterial` extras, exact three RGBA gradient
   texels and sampler settings, complete base-map sampler/transform metadata, every glow
   material uses `KHR_materials_unlit`, and every non-default source order has matching
   node extras. Compare source and GLB semantic counts per output, with non-zero toon
   and glow floors per era, normalized sRGB color-map counts, non-color gradient/map
   counts, and the named Vertical Farm order case, so an empty metadata pass cannot be
   green.
2. **Runtime restoration:** load through the repository's `GLTFLoader`, run the adapter,
   and assert no tagged toon transport remains, every reconstructed material is
   `MeshToonMaterial`, every glow remains `MeshBasicMaterial`, gradient RGBA bytes,
   base maps, transforms, samplers, and all recorded render fields match, and node order
   is restored. The test asserts the source gradient is `CanvasTexture`, the restored
   gradient is `DataTexture`, and their sampled output is equivalent rather than
   claiming class identity. Color-bearing base maps restore as sRGB; gradient/scalar
   textures remain non-color.
3. **Sharing and lifecycle:** meshes that shared a source material still share one
   restored material; matching toon records share one gradient texture; repeated
   restoration and React rerenders preserve object identity; advancing frames allocates
   no material or gradient.
4. **Anisotropy capability:** raw metadata and restored Era 9/10 maps retain requested
   anisotropy `8`; renderer upload tests with capability maxima `1`, `4`, and `16`
   observe effective values `1`, `4`, and `8` while the shared texture property remains
   `8`. Non-anisotropy transform and sampler fields are checked in the same test.
5. **Vertical Farm ordering:** the Cyberpunk farm's clear façade panes carry raw node
   extras `3`, restore to `renderOrder = 3`, remain separate from incompatible order
   buckets, and render in the same overlap order as the source.
6. **Rendered fidelity:** for every one of 87 states, render the seeded source group and
   the normalized source group and the restored GLB sequentially in the same browser,
   renderer, camera, lights, viewport, color-management state, and runtime preparation.
   Compare same-run framebuffer pixels, with alpha exact, mean absolute RGB error at most
   `0.5/255`, and RGB p99 error at most `2/255`. The test is demonstrated red for raw
   unbridged modern evaluation and plain `GLTFExporter` output, and green only with both
   extraction normalization and restoration enabled. Any state outside those limits
   blocks promotion; it does not authorize a visual downgrade. This is fair-weather
   placed/preview fidelity; winter and the deliberately recolored placement ghost use
   their separate §9.2/§9.3 contracts.

The source contains no model lights, animation clips, animation mixers, skins, morph
targets, or render callbacks. Steam and drones are static geometry; steam omitted by
`bare=true` remains omitted. Every shipping GLB remains a static glTF 2 asset with no
lights, cameras, animations, skins, or morph targets.

### 6.6 GLB validation

Before promotion, validate all 87 staged files:

- valid GLB framing and glTF 2 declaration;
- exact planned basename and destination;
- non-empty scene, mesh, primitive, vertex, and triangle populations;
- finite accessor values and finite non-zero bounds;
- coherent index ranges and attribute counts;
- coherent normals and UVs wherever present, required UVs on every textured primitive,
  and valid embedded images, samplers, and texture references;
- valid alpha modes and double-sided flags;
- a valid scene-level late-era schema tag;
- complete three-RGBA-texel gradient records, base-map transform/sampler/anisotropy
  records, toon/unlit material extras, and exact source semantic census;
- no source base map, transform, sampler request, or embedded image silently dropped;
- exact non-default render-order node extras;
- `KHR_materials_unlit` on every source glow and on no toon transport;
- no unsupported extension and specifically no
  `KHR_draco_mesh_compression` or `EXT_meshopt_compression`;
- no animation, light, camera, skin, or morph target;
- no external URI;
- no runtime height-cap activation after the standard prepare step; and
- no page exception, console error, warning, failed resource, or asynchronous export
  completion left unresolved. The surrogate bridge means the unsupported-toon exporter
  warning is no longer expected and may not be allow-listed.

Source mesh count, shipped mesh count, triangle count, materials, images, and bounds are
recorded per file. Mesh merging must reduce or preserve mesh count and preserve triangle
count exactly.

## 7. Output and metadata contracts

### 7.1 Output locations

Skill and civic GLBs are flat in:

`apps/web/src/city/art/models/`

Town Hall GLBs are in:

`apps/web/src/city/art/models/townhall/`

The existing non-recursive registry boundaries remain. The skill glob excludes
`civic-*.glb`; the civic glob owns exactly that prefix; the Town Hall registry owns its
subdirectory. No recursive glob is introduced.

### 7.2 Combined metadata

Write one deterministic metadata file:

`apps/web/src/city/art/building-sources/era-08-10-gridwork-export-metadata.json`

The metadata schema is version `1` and contains:

- source repository path, byte count, SHA-256, manifest count, selected resource ids,
  and decoded kit sizes;
- generator path;
- `bare: true`;
- seed algorithm and exact basename seed rule;
- batching declaration:
  `world-transform + exact material/index/attribute/render-order signature`;
- semantic transport schema `gridworkLateEraAsset/gridworkMaterial` version `1`;
- legacy-encoding bridge version, accepted-assignment count, and zero unsupported values;
- exact definition and output census globally and per era;
- exact skill/civic/Town Hall category census;
- one row per output, sorted by repository-relative path, with:
  - file;
  - era;
  - all six raw source roster fields, with `tab` and `title` separate;
  - kind;
  - runtime identity;
  - stage;
  - runtime footprint;
  - seed input and numeric seed;
  - SHA-256 and bytes;
  - source and shipped mesh counts;
  - source and shipped triangle counts;
  - material, toon-material, unlit-material, base-map, texture, and embedded-image
    counts;
  - requested-anisotropy histogram and restored-sampler semantic digest;
  - color-space role census (`SRGBColorSpace` color maps versus non-color maps);
  - toon semantic records, non-default render-order count, and a canonical semantic
    metadata digest;
  - min, max, and size bounds;
- per-era and global aggregate bytes, meshes, triangles, materials, and images.

The file contains no timestamp, absolute intake path, machine path, browser profile,
process id, or unordered object traversal. It is byte-identical across deterministic
runs. Comparison-mode output does not rewrite it.

## 8. Staging, promotion, and path safety

### 8.1 Owned staging and validation

One invocation owns one unique `mkdtemp` staging root. It exclusively generates the exact 87
GLBs and one metadata manifest there, then completes all source/census, structural, semantic,
fidelity, deterministic-image-order, hash, and manifest validation before production receives a
write. Every stage/scratch root is removed in `finally`; a generation or validation failure leaves
production unchanged.

The 88 paths are new unique late-era paths, not replacements for Era 1–7 assets. The contract
does not claim one simultaneous filesystem rename for 88 paths.

### 8.2 Checks and custom output

`--check` stages in its owned scratch root and compares production read-only. `--check --no-seed`
uses only owned seeded/unseeded scratch sets. Both clean in `finally` and never write production.

`--out` requires the caller to supply a non-existent child beneath a parent created with `mkdtemp`
for that invocation. The exporter creates that child and returns an inode/nonce-bearing ownership
handle. Existing destinations, in-place overwrite, traversal, source/production containment,
symlinked ancestors/destinations, and non-regular planned targets fail before output generation.
Every failure cleans the verified owned root; only an explicit successful caller path may retain
the completed root. `--comparison` instead owns and cleans its scratch root internally.

Comparison is scratch-only: it writes `bare=false` GLBs to its owned root, writes no shipping
metadata, takes no destination lock, and never reaches publication. Owned custom shipping output
uses its ownership handle and writes its own deterministic metadata, but likewise takes no
production lock or promotion path. Only default shipping publication can acquire the destination
lock and publish the release manifest.

### 8.3 Brief destination lock and manifest-last publication

After staging validates, default production publication takes a short single-writer lock at the
destination with `open(lockPath, O_CREAT | O_EXCL | O_WRONLY, 0o600)`. Stage ownership exists
before the lock attempt and nested `try`/`finally` blocks always dispose it, including lock
contention and lock-release errors. The payload is only a random nonce, `process.pid`, and
`"promotion"` mode. An existing lock immediately refuses with a clear path. There is no waiting,
liveness check, age rule, automatic stale-lock deletion, owner takeover, or marker protocol. A
human may remove a confirmed stale lock after inspecting this isolated worktree.

The publisher releases the lock only after rereading matching nonce/device/inode; mismatch fails
without unlinking another process's lock. For every GLB it writes a nonce-owned destination-local
temporary sibling, fsyncs and hash-checks it, renames it, then fsyncs the parent directory.
Metadata uses the same sequence **last**. The complete validated metadata manifest is the sole
publication marker. Prior-era assets never appear in the promotion plan.

### 8.4 Fail-closed incomplete output and explicit repair

The frozen release-owned set is exactly 87 planned GLB relative paths across the existing flat
models and Town Hall roots plus the one metadata path, for 88 owned paths. It is not a claim that
the shared models root contains only 87 files: 150+ unrelated prior-era GLBs remain legal.
Before any publication, `N=0` means no release-owned late-era GLB and no metadata manifest. The
Task 11 no-flags main permits that initial state and generates a fresh release-owned stage; runtime
registration remains unavailable and `--check` reports the release absent. After interruption,
`N=1..87` is incomplete and no-flags main, runtime registration, and `--check` refuse with
explicit repair. `N=88` is complete and must pass only when recursive validation applies the
frozen expected-path set and its exact per-path temp-sibling grammar, finds the exact
release-owned set, rejects unknown expected-stem candidates, symlinks, and wrong types, and
verifies every manifest byte count and hash. Unrelated prior-era paths are enumerated but neither
counted as release-owned nor rejected.

Only `--repair-incomplete-late-era-output` may remediate it. It refuses while the destination lock
exists, then after shared-root classification and containment/no-symlink checks removes only the
immutable 87 release-owned GLB relative paths, metadata path, and exact nonce-owned late-era
sibling temporaries. It never wildcard-deletes or touches prior-era assets; it regenerates from a
fresh owned stage root and publishes the manifest last.

A fixture interrupts after every promoted count `N=0..87`; abrupt exit retains the destination
lock. The owner/interruption fixture, and no ordinary path, removes or relinquishes that lock
before repair. Each `N=0..87` ordinary use/check run refuses; repair removes only the whitelist;
a clean rerun reproduces hashes; and an Era 1–7 sentinel remains byte-identical. The `N=88`
complete-state fixture must pass ordinary use/check.

### 8.5 Integration-boundary atomicity

“Atomic” applies only to each individual destination rename and to the Git/integration release
boundary: no commit/PR includes outputs until manifest hashes/census, runtime guards, tests,
staged fidelity, and NUL-safe scope pass. It does not apply across 88 paths. A partial local tree
after interruption is an expected incomplete late-era set, not a release; prior-era bytes remain
unchanged.

## 9. Runtime wiring

### 9.1 Late-era semantic restoration boundary

The material adapter in §6.5 is part of runtime wiring, not an exporter-only validator.
Its scene tag is the capability boundary: only the 87 tagged late-era GLBs enter it.
Path prefixes and era state are not used to guess whether restoration is needed.

Exact-source material restoration is reached by:

- `PlacedModelStack`, including skill, civic, and Town Hall models;
- `BuildingThumb`; and
- `GridworkModelPreview`.

Those placed/preview paths restore the same toon/unlit/render-order semantics before
first render. `GhostBuilding` is intentionally different and follows §9.3. The
implementation does not add a renderer-wide loader plugin, mutate the globally cached
`useGLTF` scene, or change earlier model revival. Tests prove an untagged existing GLB
takes the pre-feature preparation branch and mount one tagged fixture through each
exact-material seam to prove none can expose the transport material.

### 9.2 Live opacity and winter modifiers

Restoring the material class is not sufficient if live runtime effects overwrite its
authored state. `PlacedBuilding.tsx` and `winterFrost.ts` therefore receive narrowly
scoped changes.

#### Cross-fade is a multiplier

Replace `applyOpacity`'s per-frame tree traversal and absolute assignment with a binding
cache built once when a prepared layer object changes. For each unique prepared
material, cache:

- the material reference;
- authored `opacity`;
- authored `transparent`;
- authored `depthTest`;
- authored `depthWrite`;
- authored `colorWrite`; and
- authored blending mode.

The cache preserves source material sharing and is reused by every frame. A frame
performs only scalar/property writes over that fixed array:

- `material.opacity = baseOpacity * fade`;
- while `fade < 1`, `material.transparent = true` so opaque materials can fade;
- at steady `fade = 1`, restore `baseTransparent` exactly; and
- never replace authored `depthTest`, `depthWrite`, `colorWrite`, or blending values.

`needsUpdate` changes only when the effective transparent mode crosses its boolean
boundary. The frame loop does not traverse the object, clone a material, allocate an
array/map, or rewrite cached base state.

The Cyberpunk Vertical Farm clear panes are the named regression:

- mounted and settled: `MeshToonMaterial`, `opacity = 0.34`,
  `transparent = true`, with authored depth state;
- at fade `0.5`: `opacity = 0.17`, not `0.5`, with transparency/depth state intact;
- after fading out and back to steady: exact `0.34` and `transparent = true`; and
- repeated frame advancement creates no material, texture, or binding object.

An opaque control material proves `1 × fade` still behaves as the existing cross-fade.
Mounted tests exercise both reduced-motion immediate transitions and animated
cross-fades.

#### Winter preserves restored classes and base state

`prepareModel` restores tagged late-era materials first, then applies winter to that
prepared clone. `applyFrost` uses one identity map from each unique pre-winter material
to one frosted clone, so shared source materials remain shared and no cached `useGLTF`
material is mutated.

The frost transform is class-preserving:

- `MeshStandardMaterial` keeps the current matte treatment: shared color tint and
  desaturation, roughness `1`, metalness `0`, emissive black, and rime vertex colors.
- `MeshToonMaterial` remains `MeshToonMaterial`; it keeps its gradient/base maps,
  sampler, alpha, side, and depth state, receives the shared color tint/desaturation and
  rime colors, and has emissive disabled only through properties that class supports.
- `MeshBasicMaterial` remains unlit `MeshBasicMaterial`; it keeps its base map, alpha,
  side, and depth state, receives the same color tint/desaturation and rime colors, and
  is not skipped merely because it has no roughness, metalness, or emissive property.

Material-specific properties are written only when that material class owns them. The
shared color-capable path is what prevents Basic glow surfaces from bypassing winter:
their visible color must move toward `FROST_TINT` under the same amount as other
surfaces. No class is converted to `MeshStandardMaterial`.

Winter entry and exit are prepared-object transitions, not reversible mutation of one
global material. Tests mount fair → winter → fair and prove:

- toon and unlit classes never change;
- gradient/base-map identities and sampler requests survive;
- authored `opacity = 0.34`, transparency, side, and depth state survive on the Vertical
  Farm panes;
- an unlit Cyberpunk glow changes visibly under winter and returns to its exact
  pre-winter color;
- fair-weather cached GLTF materials are byte/state identical before and after; and
- cross-fade during winter still uses `baseOpacity * fade` with no per-frame allocation.

### 9.3 Ghost and shadow policy

The placement ghost is an app-level state visualization, not a source-material preview.
`GhostBuilding` intentionally keeps its existing policy:

- replace all source toon/unlit materials with the one shared valid/invalid
  `MeshStandardMaterial`;
- tint toward existing green `#5bbf72` or rose `#e06a94`;
- keep `transparent = true`, `opacity = 0.5`, `depthWrite = false`,
  `roughness = 0.45`, and `metalness = 0`; and
- set every ghost mesh's `castShadow` and `receiveShadow` to `false`.

For tagged late-era GLBs, ghost preparation restores only node-level metadata required
for scene behavior, including non-default `renderOrder`, before replacing materials.
The cloned node tree and relevant node extras remain; material semantic extras need not
survive after the deliberate ghost replacement. Exact-source material fidelity applies
to placed models and previews, not ghost coloration.

Source shadow bits are not part of the GLB fidelity promise. Placed models continue the
current runtime policy in `prepareModel`: every mesh casts and receives shadows.
Ghosts continue the disabled-shadow policy above. Rendered source-vs-runtime material
comparisons apply the same placed-model shadow policy to both sides or disable shadow
maps on both sides, so they do not misreport an app lighting decision as source drift.

Tests prove:

- a tagged Vertical Farm ghost contains only the shared green/rose translucent
  `MeshStandardMaterial`, never restored toon/unlit materials;
- validity changes mutate only the shared ghost material's color/emissive and allocate
  nothing per frame;
- ghost meshes have both shadow flags false;
- the farm pane node keeps `renderOrder = 3`;
- the placed/thumbnail/preview versions keep restored toon/unlit materials; and
- placed late-era meshes follow the app's cast/receive-true policy regardless of source
  shadow bits.

### 9.4 Skill maps

Add exactly three node maps to `buildingAssets.ts`:

- `ERA_EIGHT_NODE_BUILDINGS`: 9 exact Atomic nodes
- `ERA_NINE_NODE_BUILDINGS`: 6 exact Information nodes
- `ERA_TEN_NODE_BUILDINGS`: 9 exact Cyberpunk nodes

The 24 entries use the stable handle implied by the ratified mass:

- `hall` → `Assembly Hall`
- `store` → `Store`
- `dwelling` → `Dwellings`
- `workshop` → `Workshop`
- `yard` → `Commons`
- `tower` → `Tower`

Their `gridworkId` values and node-to-mass assignments are exactly those shown in the
era guides and §4. The maps join `NODE_BUILDINGS` in historical precedence order. They
do not change `resolveBuildingModel(nodeId, stage)`: `site`, `construction`, and `built`
resolve their own GLBs, and `advanced` resolves `built`.

### 9.5 Ratified dressing rows

Add exact `ERA_DRESSINGS` rows for `atomic_age`, `information_age`, and `cyberpunk`.
There are 24 skill subtitles plus three hub subtitles:

- Atomic:
  - `FUN.4` → `the Weather Office`
  - `LF.1` → `the Telephone Exchange`
  - `FUN.6` → `the Radio Workshop`
  - `FUN.5` → `the Wind Tunnel`
  - `FUN.9` → `the Housing Blocks`
  - `LF.2` → `the Electronics Works`
  - `LF.3` → `the Nuclear Weapons Facility`
  - `FUN.10` → `the Power Station`
  - `LF.4` → `the Cooling Tower`
  - `town-hall` → `the Heating Plant`
- Information:
  - `EL.1` → `the Data Centre`
  - `EL.2` → `the Office Tower`
  - `EL.3` → `the Chip Factory`
  - `EL.4` → `the Research Lab`
  - `EL.5` → `the Glass Apartments`
  - `EL.6` → `the Air Force Base`
  - `town-hall` → `the Headquarters`
- Cyberpunk:
  - `TRG.1` → `the Neon Plaza`
  - `TRG.2` → `Drone Command`
  - `TRG.3` → `the Hologram Theatre`
  - `TRG.4` → `the Signal Tower`
  - `TRG.5` → `the Data Vault`
  - `TRG.6` → `the Broadcast Tower`
  - `TRG.7` → `the Robotics Lab`
  - `TRG.8` → `the Stock Exchange`
  - `TRG.9` → `the Quantum Core`
  - `town-hall` → `the Steam Vent`

Skill subtitles continue to resolve from the node's own era. Only the hub uses the live
era.

### 9.6 Civic registrations and current-era behavior

Add derived civic id rows for Atomic, Information, and Cyberpunk by filtering
`CIVIC_CATALOGUE` by era, as existing eras do. Do not hand-copy a second catalogue.

The 12 built files join `CIVIC_MODEL_TYPE_IDS` through actual resolution. For all 12,
`civicModelTypeFor(row) === row.id`. `civicOptionsForEra` remains capability-derived
and all-or-nothing:

- exactly four catalogue rows;
- exactly four distinct model types;
- exactly four distinct built GLB URLs; or
- no current-era civic options.

A partial asset set must not produce a three-of-four buy menu. The current era shows
only its own four options. Earlier purchased civic buildings remain placed and keep
their original catalogue identity and appearance.

Purchase, placement, movement, teardown, save, reload, and catch-up continue to use the
stable catalogue id. Moving or restoring a civic does not debit again. If art is
temporarily unavailable after a rollback, an existing valid placement remains in the
snapshot and `resolveRestoredCivicModel` uses the procedural built fallback; the
placement is not deleted.

### 9.7 Town Hall registrations

Add exactly:

- `atomic_age: "townhall-atomic-age-built.glb"`
- `information_age: "townhall-information-age-built.glb"`
- `cyberpunk: "townhall-cyberpunk-built.glb"`

to `TOWN_HALL_ERA_MODELS`.

All use the existing stable `TOWN_HALL_ID = "town-hall"`, the existing `3×2`
footprint, and the existing placement. They are always built and resolve with
`art: "authored"`. No site or construction Town Hall GLB is exported for these eras.

### 9.8 Stage-aware preload

Consume the Era 7 prerequisite's `nodeModelPreloadUrls` and
`usePlacedBuildingPreload` behavior:

- skill `site` → 3 URLs: site, construction, built;
- skill `construction` → 2 URLs: construction, built;
- skill `built` → 1 URL: built;
- skill `advanced` → 1 URL: built;
- civic → its one active built URL;
- Era 8–10 Town Hall → its one active built URL.

The skill/civic `usePlacedBuildingPreload` hook keeps its per-mounted-placement warmed
set: a forward stage transition does not ask that placement to preload a URL twice.

Town Hall behavior remains the narrower existing contract and gains no global warmed
set:

- `townHallPreloadUrls(modelUrl)` returns the three D1
  site/construction/built siblings when the showing URL belongs to that staged family;
- a fallback showing D1 art uses that same three-file family; and
- an authored always-built Era 8, 9, or 10 hall returns only `[modelUrl]`.

`useTownHallPreload` remains an effect keyed by the showing URL and preload function.
It asks the helper's current candidate set when that effect runs; it does not promise
one call for the application's lifetime or remember a URL globally if the hall changes
away and back. `useGLTF` may satisfy a repeated candidate from cache. Tests assert the
candidate sets and effect calls, not an inaccurate global warm-once or network-request
count. Runtime code must not call `cityModelUrls()` or `townHallModelUrls()` as a global
preload for this feature.

### 9.9 Exact registry populations

At this spec's integration base, before the Era 7 prerequisite:

- 26 model-backed skill nodes / 78 skill GLB URLs;
- 20 civic built URLs;
- 7 Town Hall URLs;
- 5 art-backed and dressed eras.

After Era 7 lands and before Era 8–10 wiring, the required prerequisite baseline is:

- 32 model-backed skill nodes / 96 skill GLB URLs;
- 24 civic built URLs;
- 8 Town Hall URLs;
- 6 art-backed and dressed eras;
- exactly the six Early Modern nodes still using procedural skill fallback:
  `GEO.1`, `GEO.2`, `CG.1`, `POL.6`, `POL.7`, `RAT.5`.

After this design is implemented on that baseline, the exact final populations are:

- 56 model-backed skill nodes / 168 skill GLB URLs;
- 36 civic built URLs;
- 11 Town Hall URLs;
- 9 art-backed and dressed eras;
- exactly the same six Early Modern nodes on procedural skill fallback.

The final nine-era shape is:

`prehistoric`, `neolithic`, `bronze_age`, `classical`, `medieval`,
`industrial`, `atomic_age`, `information_age`, `cyberpunk`.

`renaissance` is the only absent era in the skill-art, civic-art, Town Hall-art, and
dressing populations. Counts alone are insufficient; guards assert this composition.

### 9.10 Build-time asset boundary and runtime census

Browser code does not cryptographically hash local assets. The executable boundary is split:

1. A Node/build/CI validator recursively enumerates the release destination and requires the
   exact 87 regular GLBs plus the regular metadata manifest, with no extras, missing paths,
   symlinks, or wrong types. It hashes all 87 GLBs and metadata, verifies each metadata row, and
   rejects a partial whitelist set or manifest mismatch.
2. Static Vite imports/globs for the skill, civic, and Town Hall registry boundaries prove every
   registered URL resolves during the build. After Task 11 validates `N=88`, it generates
   `scripts/generate-era8-10-asset-manifest.mjs` writes
   `apps/web/src/city/art/era8To10AssetManifest.generated.ts` from normalized, sorted N=88
   metadata/job equality. That type-safe browser manifest exports
   `ERA8_TO10_ASSET_SCHEMA`, `ERA8_TO10_ASSET_FILES`, `ERA8_TO10_ASSET_URLS`, and
   `ERA8_TO10_ASSET_CENSUS`; `ERA8_TO10_ASSET_URLS` is composed from static literal Vite `?url`
   imports, while the other symbols expose the path census/schema consumed by
   `buildingAssets.ts`, `civicBuildings.ts`, and `townHall.ts`. It exposes no browser-side hash
   claim. It is not generated or imported as an
   available late-era surface before the complete set exists. Repair removes stale generated TS
   before Task 11 regenerates it, and release rollback removes it with the late-era registries.
3. The initial no-output state is permitted only so generation can create the files. Registration
   tests are red in that state. Node preflight/check/build invariants and ordinary exporter main
   refuse any partial or mismatched late-era set unless the explicit repair mode is selected.
   A complete valid set passes.

The implementation updates the exporter safety validator and its tests,
`apps/web/src/city/era8To10BuildingModels.test.ts`, the generated browser manifest and its three
registry consumers, the package `check:era8-10-models` script, and the invariant workflow. The
Vite import/glob test and Node validator are separate seams: a green browser registry test is
never offered as proof of disk hashes.

## 10. Test-first guard design

### 10.1 Red before green

Every production behavior begins with a focused failing test:

1. Source identity and source roster tests fail because the canonical source and
   exporter plan do not exist; the roster assertion compares all six raw fields,
   including separate `tab` and `title`.
2. A raw modern-evaluation test fails because legacy `.encoding = T.sRGBEncoding` does
   not set `colorSpace`; the extraction-context compatibility bridge then makes the same
   source assignment green and rejects unsupported legacy values.
3. The Era 10 dependency test defines Era 10 first, fails only when it is used before
   Era 9, then succeeds with that same definition after Era 9 loads.
4. A source-vs-plain-GLTFExporter material/render test fails on toon shading and the
   Vertical Farm pane order before the semantic bridge exists.
5. Raw texture tests fail while the gradient is misdescribed as one-channel, base-color
   maps lose normalized sRGB intent, and
   Era 9/10 base-map anisotropy and omitted sampler fields are absent.
6. A mounted Vertical Farm test fails because the current fade writes `0.5` over authored
   pane opacity instead of `0.34 × 0.5`.
7. A winter test fails because current frost treats only `MeshStandardMaterial`, leaving
   restored toon/unlit late-era materials unfrosted.
8. A tagged ghost test fails if exact-material restoration leaks into the intentionally
   green/rose Standard ghost or if shadow/order policy drifts.
9. An owned-stage test fails if any production output is opened before all staged outputs,
   structural/semantic/fidelity validation, and metadata pass.
10. A simple destination-lock test fails until `O_CREAT|O_EXCL` contention refuses with zero
    writes and changed nonce/inode cannot release the lock.
11. A manifest-last interruption fixture fails until every ordinary run rejects the incomplete
    `N=0..87` set, while `N=88` passes; abrupt exit retains the lock until the
    owner/interruption fixture relinquishes it for explicit repair, which removes only the
    whitelist while preserving an Era 1–7 sentinel.
12. Scratch/custom tests fail if check/no-seed escapes its owned root, compares by writing
    production, or custom output accepts an existing child or a symlinked destination.
13. Export reproduction tests fail because all 87 tracked outputs are absent.
14. Skill registry tests fail on the exact 24 missing node/stage mappings.
15. Civic registry tests fail on the exact 12 missing model identities.
16. Town Hall tests fail on the exact three missing authored halls.
17. Dressing tests fail on the exact 27 missing subtitles.
18. Preload tests fail on the late-era stage suffixes and Town Hall candidate sets before
    their URLs resolve.
19. Current-era civic and persistence tests fail on a named late-era purchase/restore
    journey.

A passing test written after the behavior is not accepted as evidence unless a
mutation makes the asserted defect fail at the intended line.

### 10.2 Population scope and composition

Guard populations are defined by product behavior, not by the implementation maps they
are checking:

- skill expectations derive from the real `ERA_SEQUENCE` node membership plus the
  independently asserted art-backed-era composition;
- civic expectations derive from the real four catalogue rows per era;
- Town Hall expectations derive from the explicit era sequence and hall-art
  composition;
- source output expectations derive from the evaluated source roster and exact
  six-field inventory set, including raw `tab` and raw `title`; and
- asset expectations derive from the planned repository paths, not a count of a
  handwritten expected list alone.

Every containment assertion has a non-zero floor and an exact composition assertion.
Adding an unrelated mapping to keep a count unchanged must still fail.

### 10.3 Bidirectional exceptions

The six Early Modern skill nodes form a named exception set with a reason: their era's
runtime models are outside this feature and remain procedural. Tests assert both
directions:

- every listed node still exists, belongs to `renaissance`, and lacks a complete
  three-stage GLB family; and
- every product node lacking a complete three-stage family is listed.

A listed node gaining art fails as stale, and an unlisted node losing art fails as
missing. Equivalent one-era bidirectional exceptions cover missing civic art, Town Hall
art, and dressing for `renaissance`. The exception sets are disjoint from the nine
art-backed eras and cannot grow while their population floor remains satisfied.

Any future measured seed-independent output or legitimate duplicate-byte output uses the same
shape: basename, reason, both-direction checks, a population partition, and an atomic mutation
for each direction. The current seed-independent set is explicitly and correctly empty; the
non-vacuous side of its partition is the exact 87-output random-dependent population, split
`32/23/32`. Per-era exact sets prevent a stale or wrong-era population from passing. No exception
is inferred merely because a test would otherwise fail.

### 10.4 Required mutation and interruption proofs

Alongside the source, determinism, geometry, semantic, runtime, registry, and fidelity mutations
in this document, the exporter suite must prove these reds and restore each before green:

- path traversal, ancestor/destination symlink, malformed flags, wrong source hash/census, and
  validation/fidelity failure refuse before publication;
- pre-existing destination lock refuses with zero writes; changed nonce or inode cannot release
  another process's lock;
- metadata-first, missing metadata, wrong row count, missing GLB, and changed hash fail the
  manifest/runtime/check guard;
- every incomplete interruption count `N=0..87` makes ordinary use/check refuse, while complete
  `N=88` passes; the abrupt-exit lock is relinquished only by the owner/interruption fixture
  before explicit repair removes only the exact 88 late-era paths and nonce-owned siblings;
  rerun reproduces hashes and preserves an Era 1–7 sentinel; and
- exclusive sibling-temp creation, file fsync, staged-hash verification immediately before
  rename, rename, parent fsync, metadata-last ordering, and repair-specific lock, symlink, and
  path-escape refusal each have a separate atomic red/green mutation at their final assertion.
- scratch/custom modes write only under owned roots and clean only verified contained roots.

## 11. Evidence and review protocol

### 11.1 Source and automated evidence

Record literal command output for:

- source byte count and SHA-256 at the repository path;
- exact 24-resource manifest count;
- exact `14/11/14` definition census;
- exact six-field roster rows, with raw `tab` and `title` reported separately;
- exact `32/23/32` GLB census;
- two deterministic reproductions with 87 matching hashes;
- legacy encoding assignment census, zero unsupported values, and normalized
  color-space role census;
- raw glTF RGBA-gradient, base-map sampler/anisotropy, toon/unlit, and render-order
  semantic census plus runtime restoration census;
- mounted steady/cross-fade and fair/winter/fair material-state results;
- tagged ghost/placed shadow-policy results;
- owned-stage validation, simple-lock refusal/release, manifest-last publication, all
  `N=0..87` interruption refusal, `N=88` completion pass, owner-fixture lock relinquishment,
  repair results, and Era 1–7 sentinel preservation;
- scratch-only check/probe cleanup and read-only production comparison results;
- registry populations and compositions;
- all test commands and their pass totals; and
- a clean status limited to the intended implementation paths.

### 11.2 Spatial evidence

Spatial claims require rendered learner frames, not dimensions or passing layout tests.

Capture and inspect all 87 states on the learner-mounted city surface at exactly
`1024×580`:

- uncropped;
- the complete selected plot visible;
- enough surrounding island visible to judge occlusion and scale;
- plot outline visible;
- no `?dev` surface; and
- viewport named beside every frame.

The subject is the island around the building, not a crop of the building. These frames
verify containment, grounding, centering, stage continuity, clipping, apparent scale,
and whether the authored low-fill or long-plan composition still reads on its frozen
runtime plot.

Capture additional `390×844` learner frames for the built states most likely to expose
tall/narrow or vertical-framing problems:

- `LF.4` Cooling Tower;
- `atomic_age_apartment_tower`;
- `EL.2` Office Tower;
- `information_age_residential_tower`;
- `TRG.4` Signal Tower;
- `TRG.6` Broadcast Tower;
- `cyberpunk_vertical_farm`;
- `cyberpunk_capsule_homes`; and
- the Cyberpunk Steam Vent Town Hall.

`bare=false` comparison frames may sit beside these for review, but they are labeled
comparison-only and cannot substitute for learner-mounted `bare=true` evidence.

### 11.3 Whole-era city evidence

Whole-city evidence has two deliberately separate obligations. Neither changes the island radius,
placement rules, or product behavior.

1. **Capacity-faithful caught-up city.** For each of Atomic, Information, and Cyberpunk, mount the
   real learner `CitySurface` at its current late-era radius and run the actual ring-layout and
   session placement path. Derive the seated and unseated identity sets from that behavior, assert
   they are disjoint and their union is the exact cumulative skill roster, and assert the mounted
   session contains each seated identity exactly once with no silent drop or duplication. Treat
   the derived remainder as an assertion target, not an error, and do not require all current
   civics to coexist on a saturated layout.
   Capture an uncropped `1024×580` learner frame naming the viewport and showing surrounding
   island; the frame is evidence of the real capacity state, not a claim that the full roster fits.
2. **Late-era roster galleries.** Deterministically partition the Era 8, 9, and 10 current
   rosters into learner-mounted `CitySurface` shards that each fit by the same real placement
   path. Their disjoint/complete set union displays all 72 late skill stage models
   (`24 × 3`), 12 civic built models, and three Town Halls, and records each era's current roster
   without claiming those members fit simultaneously. Assert exact category counts, no duplicate
   or missing model identity, and a non-empty behavior-derived shard population for each era.
   Capture every shard uncropped at `1024×580` with surrounding island visible. These are
   production rendering paths or an existing legitimate learner browser fixture, never a
   CSS-only or component-cropped substitute.

Civic purchase/place/move/restore journeys may use isolated valid scenarios or gallery shards, so
all twelve civics are tested without requiring four current-era civics after a cumulative layout
has saturated. The capacity census has a red mutation for wrong unseated composition; gallery
coverage has a red mutation for a silently omitted shard member.

### 11.4 Plot-fit review

For every one of 87 states, record:

- source footprint;
- runtime footprint;
- native bounds;
- prepared runtime bounds;
- uniform contain-fit scale;
- whether the height cap would activate;
- fill ratio on each ground axis; and
- human review verdict against the source intent.

There is no minimum-fill pass number. A concerning frame blocks promotion and is
reported under its exact source key. It is not automatically altered. Any proposed
composition change returns for named user approval under §5.3.

### 11.5 Performance evidence

Measure on one named browser/hardware configuration and one integration tip:

- per-file and aggregate GLB bytes, source meshes, shipped meshes, triangles, materials,
  textures, and images;
- draw calls and renderer memory for each built model;
- cold-load request count and bytes by stage;
- caught-up Era 8, Era 9, and Era 10 frame-time median and p95 after a fixed warm-up;
- repeated pan, zoom, select, move, and era-switch interaction profiles; and
- a same-tip pre-feature control with the same city fixture and camera.

For every one of the 20 select/move samples, the performance harness first reads the real
Buildings disclosure state. It opens the disclosure only when closed, waits for the roster to be
mounted, then verifies a non-zero selectable roster count before choosing a row. The disclosure
remains open for the entire interaction loop; it is not blindly toggled between iterations.
Selection and movement postconditions are invalid unless the selected row remains mounted. A
mutation that unconditionally clicks the disclosure fails the second iteration at the
roster-mounted assertion.

The required preload-candidate shape is `3/2/1/1` for skill
`site/construction/built/advanced`, one active built URL for a civic, one active built
URL for an authored late Town Hall, and the existing three-file family for D1. Actual
network requests may be zero when `useGLTF` already holds a candidate; evidence records
both helper/effect calls and network misses without treating cache hits as a defect. No
earlier era may request a late-era GLB. A measured performance concern may block
release, but it does not authorize decimation, compression, material collapse, or
composition edits.

## 12. Implementation surface and order

### 12.1 Future implementation paths

The implementation is expected to add:

- the one canonical HTML source;
- `scripts/export-era8-10-building-models.mjs`;
- one combined metadata JSON;
- 87 GLBs;
- `apps/web/src/city/era8To10BuildingModels.test.ts`;
- `apps/web/src/city/era8To10ExporterSafety.test.ts`;
- `apps/web/src/city/era8To10MeshBudget.test.ts`;
- `apps/web/src/city/era8To10ModelFit.test.ts`;
- `test/era8To10ExporterReproductionGate.test.ts`;
- `apps/web/src/city/three/lateEraGridworkMaterial.ts`;
- `apps/web/src/city/three/lateEraGridworkMaterial.test.ts`;
- `apps/web/src/city/three/lateEraGridworkMaterialFidelity.browser.test.tsx`;
- `apps/web/src/city/three/lateEraLiveMaterials.test.tsx`; and
- `apps/web/src/city/three/lateEraGhostMaterials.test.ts`.

It is expected to modify the existing registries, previews, population guards, current
civic tests, persistence tests, `PlacedBuilding`, `GhostBuilding`, `BuildingThumb`,
`winterFrost.ts`, `winterFrost.test.ts`, package scripts, and invariant workflow needed
to wire and verify the late-era files.

It must not add `placedBuildingPreload.ts`; that file and its behavior belong to the
Era 7 prerequisite. It must not add or modify concept-image assets.

### 12.2 Ordered implementation

1. Confirm the Era 7 integration change is actually merged, fetch the new
   `origin/integration`, and rebase or recreate the implementation branch from that tip.
2. Re-read Era 7's merged exporter safety, `nodeModelPreloadUrls`,
   `usePlacedBuildingPreload`, civic capability derivation, Town Hall preload, and
   population guards. Resolve interface drift in this document before production work.
3. Run and record the exact post-Era 7 prerequisite population baseline in §9.9.
4. Write red source/census, six-field roster, raw-modern legacy-encoding, Era 10
   use-before-base, output-plan, and plain-export material/render-order/texture-sampler
   tests.
5. Copy the canonical HTML byte-for-byte and make source identity tests green.
6. Write red determinism, geometry, semantic metadata, path-safety, lock refusal, manifest-last
   interruption/repair for incomplete `N=0..87` and complete `N=88`, scratch, and custom-output
   tests.
7. Implement the data-driven exporter with isolated `mkdtemp` staging, r128 normalization,
   semantic transport, manifest-last promotion, and the short-lived destination lock.
8. Run it once to stage, validate, promote all 87 GLBs, and write metadata last.
9. Implement the tagged runtime restoration adapter through the shared preparation
   seams, including RGBA gradient conversion and complete base-map sampler restoration;
   make material type, sharing, anisotropy-capability, Vertical Farm order, and all-state
   source-vs-runtime fidelity tests green.
10. Replace absolute per-frame opacity writes with cached base-state fade bindings,
    extend class-preserving winter frost, and pin the deliberate ghost/shadow policy;
    make mounted fade, winter enter/exit, allocation, and ghost tests green.
11. Write red skill, dressing, civic, Town Hall, preload-candidate, current-era, and
    persistence tests.
12. Add exactly 24 skill bindings, 27 dressing entries, 12 civic model registrations,
    and three Town Hall entries; make the runtime tests green.
13. Run mutation and abrupt-exit injection proofs, including the separately identified
    temp-create/fsync/hash-before-rename/rename/parent-fsync/metadata-last/repair-refusal guards.
14. Run complete automated validation.
15. Capture and inspect all spatial, whole-city, plot-fit, material-fidelity, and
    performance evidence.
16. If a composition concern remains, stop with that item not accepted. Do not amend it
    without the named user approval required by §5.3.

## 13. Risks and rollback

### 13.1 Risks

- **Era 7 integration drift:** The prerequisite currently exists outside
  `origin/integration`; copying its unmerged files would duplicate work and preserve
  stale assumptions. Mitigation: wait for the merge and re-read the landed interfaces.
- **Era 10 use-before-base failure:** Era 10 may be defined before Era 9 but cannot be
  used before its lazy base resolves. Mitigation: test definition, failing early use,
  then successful use of the same definition after Era 9 loads.
- **Wrong identity from readable labels:** Several stable catalogue ids intentionally
  disagree with display names, and source `tab` and `title` differ. Mitigation:
  six-field source rows, explicit runtime mappings, and persistence tests.
- **Random output drift:** Dozens of source random calls and asynchronous canvas image
  conversion can make ordering observable. Mitigation: isolated per-basename streams,
  sorted output data, reversed-order proofs, and digest reproduction.
- **Material/render drift:** Plain glTF cannot carry toon gradients, depth flags, or
  object render order, and omits requested anisotropy. Accepting its transport material
  or sampler defaults would silently change the art. Raw modern evaluation also drops
  r128 `.encoding` intent. Mitigation: isolated legacy color-space normalization,
  color/non-color role guards, all-three-RGBA-texel metadata, complete base-map
  sampler/transform metadata, capability-aware anisotropy, tagged runtime restoration,
  unlit validation, Vertical Farm order proof, material-sharing/lifecycle tests, and
  all-state rendered source-vs-runtime comparison.
- **Live modifier drift:** Cross-fade currently overwrites authored opacity and winter
  currently skips non-Standard materials. Mitigation: cached base-state multiplication,
  class-preserving shared frost, Vertical Farm `0.34` transition tests, and
  fair/winter/fair restoration tests including unlit glow.
- **Ghost-policy confusion:** Exact-source materials are wrong for the green/rose
  placement ghost, while source shadow bits are not the app's policy. Mitigation:
  explicit ghost material replacement, node-order-only restoration, disabled ghost
  shadows, cast/receive-true placed shadows, and separate tests.
- **Silent composition redesign:** A generic fill floor or fit heuristic would alter
  most of the inventory. Mitigation: no floor, no auto-rotation, exact bounds baselines,
  all-state frames, and named approval for any amendment.
- **Runtime height squash:** A tall model can trigger non-uniform Y scaling.
  Mitigation: make any height-cap activation a hard validation failure.
- **Interrupted publication:** A process can stop after one or more model renames, or after the
  manifest, and retain its lock. Mitigation: owned staging validates first; `N=0..87` fail
  closed, `N=88` is complete, and only the owner/interruption fixture relinquishes an abrupt-exit
  lock before explicit repair deletes fixed late-era paths and nonce-owned siblings, then
  regenerates.
- **Concurrent local publisher:** Mitigation: the brief destination `O_CREAT|O_EXCL` lock
  refuses a second writer. It has no stale-owner automation, and nonce/inode release cannot
  remove another writer's lock. Checks/probes remain owned scratch/read-only operations.
- **Wrong guard population:** A guard derived from the map it checks can pass while
  omitting a whole era. Mitigation: independent graph/catalogue/source populations,
  floors, exact compositions, and mutation proofs.
- **Performance pressure:** Exact-source geometry may be heavy, and the design forbids
  destructive optimization. Mitigation: signature-safe per-model merging, on-demand
  stage-aware fetches, measurements, and an explicit stop-and-decide path.

### 13.2 Rollback

Failure before publication removes only its owned stage/custom root. Incomplete publication is
not automatically rolled back: normal use fails closed and explicit §8.4 repair is available only
after confirming no destination lock.

Release rollback removes the Era 8–10 registry entries, GLBs, exporter, metadata, and
canonical late-era source as one versioned change while leaving the Era 7 prerequisite
intact. The late-era restoration adapter may be removed in that same rollback after no
tagged assets remain; its capability gate means leaving it temporarily is inert. The
tag-gated fade preparation, extended class-preserving frost coverage, and late-era ghost
metadata seam roll back with it while existing untagged behavior remains unchanged.
Late skill nodes then use the existing procedural stage fallbacks. Late Town Halls use
the existing reported fallback. Existing valid civic placements are retained and render
through `resolveRestoredCivicModel`'s procedural built fallback; their stable catalogue
ids are not rewritten or discarded.

There is no database schema migration, no persisted-id migration, and no destructive
state rewrite in this feature. Rollback therefore does not require data conversion.

## 14. Acceptance checklist

This checklist is for the implementation. This design document alone does not satisfy
any runtime item.

1. [ ] **Source-integrity evidence — literal hash and size output.** The canonical
   repository HTML is exactly `1,928,383` bytes with SHA-256
   `6ee885ef8af7b7c9d9b26cf0ec219fa2c7f5fa8a88133794714f49ef8ba37a69`;
   the manifest count is exactly 24.
2. [ ] **Census evidence — red/green automated test.** The source evaluates to exact
   definition populations `14/11/14`, exact built-only sets, and exact output
   populations `32/23/32`; removing any named source key fails by name.
3. [ ] **Inventory evidence — manual source-to-spec review.** All 39 rows match all six
   raw source fields in order, including distinct `tab` and `title`, plus runtime
   identity, runtime footprint, stage count, and basename. `Apartments` /
   `the Apartment Tower` and `Drone Command` / `the Drone Command` are explicit passing
   cases, not normalized strings.
4. [ ] **Era 10 dependency evidence — behavioral red/green test.** Era 10 can be
   defined first; using or instantiating it before Era 9 fails; the same already-defined
   constructor succeeds after Era 9 loads. A test that only inspects script order does
   not satisfy this item.
5. [ ] **Era 7 dependency evidence — current-tip repository inspection.** Era 7 is
   merged before implementation, its merged SHA is recorded, and no Era 7 asset,
   registration, or preload file is duplicated here.
6. [ ] **Simple publication safety — red/green lock, manifest-last, and interruption tests.**
   One `mkdtemp` stage validates all outputs before production writes; lock contention refuses;
   nonce/inode mismatch prevents release; `N=0..87` interruptions fail closed, `N=88` passes,
   and abrupt-exit lock release is owner-fixture-only before explicit whitelisted repair, after
   which hashes reproduce and the Era 1–7 sentinel is unchanged.
7. [ ] **Determinism evidence — two runs plus order mutations.** Two ordinary runs,
   reversed job order, and reversed image-completion order produce all 87 identical
   hashes; the no-seed probe proves an exact empty seed-independent set and an exact
   `32/23/32` random-dependent population, with false-classification and omission mutations.
8. [ ] **Geometry evidence — automated validator.** Every GLB is valid static glTF 2,
   has finite coherent geometry, preserves triangle count through batching, uses no
   forbidden compression, has no external URI, and does not trigger runtime height
   squash.
9. [ ] **Raw gradient/map/order evidence — source and GLB JSON tests.** `_grad()` is
   proven to be a `3×1` RGBA `CanvasTexture`; all three RGBA texels and every required
   sampler/color-space/mipmap/flipY/premultiply field are in schema-1 extras. Every base
   map is captured after legacy normalization, retains its glTF image/transform plus
   complete omitted sampler metadata, including Era 9/10 requested anisotropy `8`.
   Color maps are sRGB while gradient/non-color textures are not. Every glow uses
   `KHR_materials_unlit`; every non-default object order has node extras; Vertical Farm
   panes record `3`.
10. [ ] **Runtime restoration evidence — loader/adapter and capability tests.** Tagged
    transports reconstruct as `MeshToonMaterial`; the RGBA `DataTexture` is explicitly
    render-equivalent to, not class-identical with, the source CanvasTexture; unlit glow
    remains `MeshBasicMaterial`; maps/transforms/samplers and material fields match.
    Requested anisotropy remains `8`, while renderer maxima `1/4/16` produce effective
    `1/4/8`. Untagged existing GLBs take the unchanged earlier path.
11. [ ] **Sharing/lifecycle evidence — identity and allocation test.** Source-shared
    materials stay shared, identical RGBA gradients and compatible base-map sampler
    records share cached textures, repeated restoration/rerenders retain identities, and
    frame advancement allocates no material, texture, map clone, or binding.
12. [ ] **Rendered material fidelity — same-run framebuffer comparison.** All 87 seeded
    normalized-source/restored fair-weather placed/preview pairs meet exact alpha, mean
    RGB error `≤ 0.5/255`, and RGB p99 error `≤ 2/255`; raw unbridged modern evaluation,
    plain exporter output, and an incorrectly reconstructed one-channel gradient are
    demonstrated red first. The Vertical Farm overlap and anisotropic Era 9/10 map cases
    are included.
13. [ ] **Live cross-fade evidence — mounted steady/transition tests.** The Vertical Farm
    pane settles as toon, opacity `0.34`, transparent with authored depth state; fade
    `0.5` produces `0.17`; fade-out/back restores exact base state. Opaque control,
    reduced motion, animated transition, rerender, and frame-allocation cases pass.
14. [ ] **Winter material evidence — fair/winter/fair mounted tests.** Restored toon and
    unlit classes never convert; gradient/base maps, sampler requests, opacity, side, and
    depth survive; shared frost tint/rime reaches both classes; unlit glow visibly changes
    in winter and returns exactly; cached fair state remains untouched.
15. [ ] **Ghost/shadow evidence — precise app-policy tests.** Tagged ghosts use only the
    existing shared green/rose translucent `MeshStandardMaterial`, disable both shadow
    flags, retain needed node metadata and farm-pane order, and allocate nothing per
    frame. Placed/preview versions retain toon/unlit materials, and placed meshes follow
    cast/receive-true policy without claiming source shadow-bit fidelity.
16. [ ] **Skill registry evidence — red/green population and mutation guards.** Exactly
   24 new nodes resolve their three own stage URLs, `advanced` reuses `built`, and final
   population is 56 nodes / 168 URLs with the exact six Early Modern exceptions.
17. [ ] **Civic registry evidence — red/green population and identity guards.** Exactly
    12 new catalogue/model identities resolve one distinct built URL, final population
    is 36, and display-label substitutions fail.
18. [ ] **Town Hall evidence — red/green registry guard.** Atomic, Information, and
    Cyberpunk resolve their exact built hall with `art: "authored"`; final Town Hall URL
    population is 11 and Early Modern remains the sole era-art exception.
19. [ ] **Dressing evidence — prose review plus exact-set test.** All 27 late-era
    subtitles match the ratified guide rows, including British/American spelling and
    the source-title/product-article difference for Drone Command; final
    art-backed/dressed era population has the exact nine-era composition.
20. [ ] **Preload evidence — red/green candidate/effect test.** Skill candidates are
    exactly `3/2/1/1` by stage and retain their per-placement warmed set; a civic has one
    active built URL; each late Town Hall helper result is its one built URL; D1 retains
    its three-file family. No global Town Hall warmed-set or global late-era preload is
    added, and cache hits are not counted as missing behavior.
21. [ ] **Current-era civic evidence — end-to-end behavior test.** Each late era offers
    exactly its four current civic rows only when all four models resolve; a partial
    set offers none.
22. [ ] **Persistence evidence — end-to-end bug reproduction and fix proof.** A named
    civic from each late era can be purchased, placed, moved, saved, restored, and
    moved again under its canonical placement id without a second debit or identity
    change.
23. [ ] **Exception evidence — bidirectional mutation proof.** Early Modern and every
    measured seed/duplicate exception fail when stale and fail when a qualifying member
    is omitted; each containment population has a floor and exact composition.
24. [ ] **Spatial evidence — 87 uncropped learner frames.** Every state is inspected at
    `1024×580` with plot and surrounding island visible; no cropped or `?dev` frame is
    substituted.
25. [ ] **Tall-model evidence — selected uncropped learner frames.** The nine named
    tall/narrow cases are inspected at `390×844` and their viewport is recorded.
26. [ ] **Capacity and gallery evidence — learner frames plus exact set censuses.** Three
    capacity-faithful caught-up Atomic/Information/Cyberpunk learner frames name
    `1024×580`, show surrounding island, and prove exact derived seated/unseated partition
    without silent drop or duplication. Deterministic learner-mounted galleries have a
    disjoint/complete union of 72 late skill-stage models, 12 civics, and three halls, with
    non-empty behavior-derived shard populations per era and uncropped frames; no frame claims
    all members fit simultaneously.
27. [ ] **Plot-fit evidence — measurements plus human review.** All 87 states have
    source/runtime footprints, native/prepared bounds, scales, fill ratios, cap status,
    and a reviewed verdict; no universal fill threshold or automatic amendment is used.
28. [ ] **Performance evidence — same-tip comparative profile.** Asset budgets,
    preload-candidate/effect calls, actual cache misses, renderer counts, frame-time
    median/p95, and repeated interaction profiles are recorded against a same-tip
    control. Every select/move sample observes the real Buildings disclosure state, opens only
    when closed, proves the roster is mounted before counting/selecting, and leaves it open
    across the loop; any concern is resolved without a forbidden optimization or remains
    unaccepted.
29. [ ] **Composition-approval evidence — exact diff review.** Shipping output contains
    no exporter-authored composition amendment. Any later amendment carries the named
    user approval required by §5.3 and passes its bidirectional guard.
30. [ ] **Final-scope evidence — status and diff output.** Only approved source, exporter,
    metadata, 87 assets, tagged restoration, scoped fade/frost/ghost integration, simple lock and
    manifest guards, registrations, workflow wiring, and evidence artifacts changed; no Era 1–7
    production path or concept image changed.
31. [ ] **Rollback evidence — interruption repair and release restore rehearsal.** Every
    `N=0..87` interruption refuses normal use, `N=88` passes, owner-fixture-only lock
    relinquishment precedes repair, repair changes only named late-era paths, and release rollback
    retains specified application fallbacks without state loss.
32. [ ] **Legacy color-space bridge evidence — extraction-context red/green tests.**
33. [ ] **Scratch-mode evidence — owned-root cleanup and read-only production comparison.**
34. [ ] **Manifest/runtime guard evidence — missing/stale manifest and any hash/census mismatch
    reject registration and check.**
35. [ ] **Release-boundary evidence — NUL-safe staged scope requires manifest, runtime guards,
    staged fidelity, and all tests; it does not claim simultaneous 88-file filesystem atomicity.**
