# Era 08 — Atomic Age building concepts

**Era id:** `atomic_age`

**Display name:** Atomic Age

**Current material id:** `electricity`

**Status:** canonical concept-image handoff for the fourteen buildings Era 8 adds or
rethemes.

This folder is the modelling reference set for Era 8: nine earned skill buildings, the
rethemed Town Hall, and four bought civic buildings. Earlier buildings keep their original
era dress and are outside this census.

## Shared production contract

- One finished building or one connected complex on one complete discrete plot.
- Polished low-poly isometric city-builder concept, 1024×1024, three-quarter overhead,
  pale neutral ground, no neighboring city, split views, text, labels, numbers or glyphs.
- Build from 2–5 primary volumes. Prefer broad planes and repeated bays that can be
  instanced: normally 6–18 large openings or panels, 1–3 roof/service elements and 3–8
  large functional props. A guarded blank block or one-shell tower is a deliberate scoped
  exception.
- Every load path must be plausible: concrete folds and shells land on frames or points,
  cantilevers tie back to structure or use posts, canopies land on posts or beams, balcony
  slabs return to the frame, lattice gear lands on pads, and rails, drains and pipes meet
  the ground.
- The body is pale poured and precast concrete `#B9B5AC`. Board-marked in-situ work carries
  vertical grain; smooth precast carries a visible panel-joint grid. Corners are crisp,
  with modest rain streaking and service wear rather than pristine science fiction.
- Period teal `#6E9C9A` is a limited accent on opaque panels, doors, fascia geometry and
  equipment cabinets. Structural steel is dark and slender; aluminium is a thin bright
  line at copings and glazing beads; plate glass comes in broad panes.
- Ground beyond the plot is pale parchment `#ECE4D3`. Inside the plot use precise poured
  paving, asphalt where vehicles run, large expansion joints, kerbs, drains, restrained
  planting and painted hatching.
- Flat dark bitumen or metal roofs are the default. Folded plates, north lights and thin
  shells occur only where named. No emitted light is present anywhere in the set.

## Era boundaries

**Earlier boundary — Industrial:** no dominant soot-red brick mill, repeated Victorian
arches, exposed cast-iron truss, giant smokestack, slate factory roof or rail-yard clutter.
Use pale concrete frames, broad plate glass, flat planes and small grounded service equipment.

**Later boundary — Information:** no generic corporate glass box, corner-to-corner sealed
curtain wall, composite skin, black office slab, server farm, rooftop chiller rank, giant
digital screen or ubiquitous grid facade. Concrete remains the body and visible machinery
remains honest.

**Futurism boundary:** no neon, holograms, levitation, glowing reactors, ray guns, giant
reactor domes, fantasy antennas or space-age vehicles. Atomic identity comes from credible
postwar civic and scientific construction, not science-fiction props.

## Canonical census

### Skill buildings

| Order | Output | Node | Display name | Mass | Plot | Relative height |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `fun-4-weather-office.png` | `FUN.4` | the Weather Office | `hall` | 2×2 default | low single-storey hall band |
| 2 | `lf-1-telephone-exchange.png` | `LF.1` | the Telephone Exchange | `hall` | 2×2 default | level with Weather Office |
| 3 | `fun-6-radio-workshop.png` | `FUN.6` | the Radio Workshop | `store` | 2×2 default | lowest roofed skill building |
| 4 | `lf-3-nuclear-weapons-facility.png` | `LF.3` | the Nuclear Weapons Facility | `store` | 2×2 default | low, wide shed band |
| 5 | `fun-9-housing-blocks.png` | `FUN.9` | the Housing Blocks | `dwelling` | 2×2 default | four-storey high skill band |
| 6 | `fun-5-wind-tunnel.png` | `FUN.5` | the Wind Tunnel | `workshop` | 2×2 default | above the sheds, below housing |
| 7 | `lf-2-electronics-works.png` | `LF.2` | the Electronics Works | `workshop` | 2×2 default | low shed, above Radio Workshop |
| 8 | `fun-10-power-station.png` | `FUN.10` | the Power Station | `yard` | 2×2 default | tall hall and taller boiler-house band |
| 9 | `lf-4-cooling-tower.png` | `LF.4` | the Cooling Tower | `tower` | 2×2 default | landmark-height infrastructure |

### Town Hall

| Order | Output | Runtime id | Display name | Plot | Relative height |
| --- | --- | --- | --- | --- | --- |
| 10 | `townhall-atomic-heating-plant.png` | `town-hall` | the Heating Plant | 3×2 | wide civic frontage with a taller plant behind |

### Civic buildings

| Order | Output | Stable id | Role | Display name | Plot | Civic height |
| --- | --- | --- | --- | --- | --- | --- |
| 11 | `civic-supermarket.png` | `atomic_age_supermarket` | food | The Supermarket | 2×2 | fourth / lowest |
| 12 | `civic-apartment-tower.png` | `atomic_age_apartment_tower` | dwelling | The Apartment Tower | 1×1 | first / tallest |
| 13 | `civic-swimming-pool.png` | `atomic_age_swimming_pool` | amenity | The Swimming Pool | 3×2 | second |
| 14 | `civic-fire-station.png` | `atomic_age_community_centre` | blend | The Fire Station | 2×1 | third, drill tower slightly higher |

The order above is the JSONL and image order. It groups each shared-mass pair so their
separating axis can be reviewed together, then Town Hall, then live civic-catalogue order.

## Concise building descriptions

1. **the Weather Office** — A long low concrete bar with a continuous ribbon window
   wrapping its corners under one clean flat roof. One deeper chart-room bay shows recorder
   cabinets and paper traces; a weather box and anemometer stand outside. Those instruments
   separate it from the otherwise similar Telephone Exchange.

2. **the Telephone Exchange** — One uninterrupted single-storey precast bar with horizontal
   spandrels and broad ribbon glazing. Its signature is a very thin entrance canopy on
   slender posts, with cable-entry louvres and route markers providing the function. Keep
   the interior blank and do not add the Weather Office's chart room.

3. **the Radio Workshop** — A very low, long side-loading shed: many narrow closed roller
   shutters at ground level and one continuous clerestory above. Racks of radio sets, valves
   and chassis remain visible through that band; crates occupy one fenced stillage yard.
   It is busy and repetitive, not a blank guarded block.

4. **the Nuclear Weapons Facility** — A low windowless board-marked concrete assembly block
   standing plainly above ground, plus one small gatehouse. One deep transfer bay, an
   external sliding slab door, a flush rail spur and two fence lines with a swept gap carry
   the whole read. No weapon, missile, vehicle, symbol, berm or buried structure is shown.

5. **the Housing Blocks** — A broad free-standing four-storey slab with one continuous open
   access gallery per upper floor and a solid stair tower at each end. The turning stairs
   are the only vertical circulation; the building stands in open mown grass and encloses
   no court. It is horizontal and stair-served, unlike The Apartment Tower.

6. **the Wind Tunnel** — A compact concrete test house on a low plinth with one double-height
   glazed bay and a flat roof. A cylindrical tunnel section and instrument racks are visible
   through the glass. Keep it compact and flat-topped, with no repeated north-light roof.

7. **the Electronics Works** — A fully enclosed precast factory under four asymmetric
   concrete north-light bays, all facing one way. Only one end bay is fully glazed, showing
   electronics benches and cabinets; the long wall remains a panel grid. Concrete folds,
   not brick and iron trusses, keep the sawtooth in the Atomic era.

8. **the Power Station** — A tall ribbon-glazed turbine hall, a slightly taller blank and
   louvred boiler house ranked behind it, and an open fenced switchyard in front. Gantries,
   insulator strings and transformers land on concrete pads; one short flue and restrained
   plume clear the rear parapet. Do not revert this to an open substation yard and do not
   add the separate Cooling Tower.

9. **the Cooling Tower** — One tall waisted concrete shell on a complete ring of raked legs,
   leaving daylight visible beneath the body, with steam at the open rim. A tiny switch
   house and transformer stay subordinate. It is one closed curve, not the Power Station's
   straight glazed halls and lattice ranks.

10. **the Heating Plant** — A broad glazed civic entrance under one thin canopy, with a
    taller blank boiler-house volume directly behind. One short internal flue and plume are
    the only sign of heat. The stepped two-volume plan separates the hub from the one-storey
    Telephone Exchange.

11. **The Supermarket** — A low concrete retail box under a structurally folded plate roof,
    with a fully glazed front beneath a deep supported canopy and a blank pole-sign panel at
    the corner. Trolley bays, parking hatching and refrigerated rear service bays establish
    the use. Precast infill replaces the civic guide's stale brick reference.

12. **The Apartment Tower** — A narrow twelve-storey concrete shaft on one cell, stepping
    back once near the upper third and ending in a compact lift and plant overrun. Countable
    ribbon balconies stack up the long face above a glazed lobby. It is the tallest Era 8
    form and must remain concrete-panel housing rather than a corporate glass tower.

13. **The Swimming Pool** — A low, wide parabolic concrete shell landing on a few points
    over a glazed pool hall, with a flat entrance block and open sun terrace. The basin and
    diving stage remain visible through broad glass; one restrained teal mosaic panel marks
    the entrance. It is horizontal, unlike the tall waisted Cooling Tower.

14. **The Fire Station** — A two-storey concrete range with three appliance bays behind
    folding glass doors, ribbon glazing above and a slim drill tower at one end. Three
    period fire appliances remain visible nose-out; a hose rack and marked forecourt sit in
    front. Transparency and repeated shallow bays separate it from the guarded facility.

## Prompt source

`era08-atomic-concepts.jsonl` is the durable generation source. It contains exactly
fourteen standalone objects using the established keys:

`out`, `size`, `quality`, `use_case`, `prompt`

Every row uses `1024x1024`, `high`, `stylized-concept`, names one canonical output,
contains only positive live palette hexes, and carries its own physical, functional,
collision and no-text constraints.

## Generation and review outcome

All fourteen canonical files were generated with the built-in image tool, staged under
`tmp/imagegen/era-08-atomic/`, inspected at 1024×1024, and inspected again in 128×128
grayscale. Canonical files were copied into this folder without re-encoding.

| Image | Pass outcome |
| --- | --- |
| `fun-4-weather-office.png` | first pass accepted: ribbon-glazed chart room and weather station read at both sizes |
| `lf-1-telephone-exchange.png` | first pass accepted: thin supported canopy separates the blank low bar |
| `fun-6-radio-workshop.png` | first pass accepted: shutter rhythm, clerestory contents and stillage yard remain legible |
| `lf-3-nuclear-weapons-facility.png` | first pass accepted: deep bay, slab door, rail spur, gatehouse and double fence carry the guarded read |
| `fun-9-housing-blocks.png` | corrected pass production-approved: one glazed ground floor plus exactly three upper gallery floors make four storeys total, with exactly three gallery bands and both stair towers legible |
| `fun-5-wind-tunnel.png` | first pass accepted: tunnel cylinder and racks read through one double-height bay on a plinth |
| `lf-2-electronics-works.png` | corrected pass accepted: the first pass omitted a whole wall; the redo is enclosed with one glazed end bay and four concrete north lights |
| `fun-10-power-station.png` | first pass accepted: turbine hall, boiler house and switchyard all read in one coherent load path |
| `lf-4-cooling-tower.png` | first pass accepted: waisted shell, open leg ring, plume and subordinate switch house remain distinct |
| `townhall-atomic-heating-plant.png` | first pass accepted: broad civic front, taller rear plant and short flue establish the hub |
| `civic-supermarket.png` | first pass accepted: folded roof, glazed canopy front, trolleys, parking and rear refrigeration read clearly |
| `civic-apartment-tower.png` | first pass accepted: narrow shaft, balcony stack, setback and plant overrun survive grayscale reduction |
| `civic-swimming-pool.png` | first pass accepted: low shell, glazed pool hall, basin, entrance block and terrace remain legible |
| `civic-fire-station.png` | first pass accepted: three visible appliances, ribbon upper floor and drill tower identify the station |

The Housing Blocks file is production-approved: it visibly has exactly four storeys total,
comprising one glazed ground floor and three upper gallery floors, with exactly three
gallery bands.

## Source decisions and live contradictions

- The previous handoff was stale on `FUN.10`. It still described the retired open
  substation-yard form. The latest explicit style-guide amendment governs: the Power
  Station is a ribbon-glazed turbine hall, a taller boiler house and the retained
  switchyard in front.
- All nine skill plots intentionally resolve through `DEFAULT_FOOTPRINT` to 2×2.
  `worldLayout.ts` now names Era 8 among the deliberately deferred eras, so this is the
  live design state rather than a placeholder this handoff may repair.
- Settled display names are preserved exactly, including accepted handle mismatches such
  as `Store, the Radio Workshop`. The Atomic subtitle row is ratified in the guide but is
  not yet wired in `ERA_DRESSINGS`; this art handoff does not edit runtime naming.
- The live civic id remains `atomic_age_community_centre` while its display name is
  **The Fire Station**. Basenames follow display names; ids are not renamed here.
- The civic guide still lists brick infill on The Supermarket and The Fire Station, while
  the style guide's later and era-wide material ruling retires brick from new walls.
  Precast concrete is used in both concepts.
- The style guide spends a thin shell on a reference-only assembly hall, while the civic
  guide assigns the live shell to The Swimming Pool. Only the pool is in the deliverable
  roster, so it receives the shell.
- The palette heading remains marked `PROPOSED`, but `#B9B5AC` and `#6E9C9A` are the live
  values parsed by the palette ladder guard. Those values are used without claiming a
  later ratification.
- The era guide treats sans lettering as ornament, while this concept contract forbids
  text and glyphs. Blank fascia, notice and pole-sign panels preserve the architectural
  geometry without generated writing.
- Height is carried as named relative bands, not world-unit targets. Uniform contain-fit
  makes proportion the modeller's usable lever, and the 24-unit value is only a cap.

## Reference anchors

- Postwar weather offices and telephone exchanges: low concrete frames, ribbon glazing,
  deep entrance planes and visible service louvres.
- NACA/RAE wind-tunnel buildings and mid-century electronics works: compact test bays,
  instrument rooms, concrete north lights and honest roof plant.
- Municipal modernism: deck-access housing, folded-plate supermarkets, shell-roof pool
  halls, transparent appliance-bay fire stations and district heating plants.
- Power infrastructure: turbine and boiler halls, open switchyards, hyperbolic thin-shell
  cooling towers, bunded transformers and visible drainage.

## Primary repository sources

- `docs/superpowers/specs/eras/era-08-atomic/style-guide.md`
- `docs/superpowers/specs/eras/era-08-atomic/civic-buildings.md`
- `packages/skill-graph/src/eras.ts`
- `apps/web/src/city/worldLayout.ts`
- `apps/web/src/city/eraDressing.ts`
- `packages/economy/src/civicCatalogue.ts`
- `test/eraPaletteLadder.test.ts`
- `docs/superpowers/specs/2026-07-30-era-palette-ladder.md`
- `output/imagegen/era-07-industrial-building-briefs/`
- `output/imagegen/era-09-information-building-briefs/README.md`
