# Era 07 — Industrial building concepts

**Era id:** `industrial`

**Display name:** Industrial Era

**Current material id:** `coal`

**Status:** canonical concept-image handoff for the eleven buildings Era 7 adds or rethemes.

This folder is the modelling reference set for Era 7: six earned skill buildings, the
rethemed Town Hall, and four bought civic buildings. Earlier skill and civic buildings
keep their original era dress and are not part of this census.

## Shared production contract

- One finished building or one connected building complex on one complete discrete plot.
- Polished low-poly isometric city-builder concept, 1024×1024, three-quarter overhead,
  flat neutral ground, no neighboring city, no split views, and no text, labels, numbers
  or glyphs.
- Build from 2–5 primary masses. Repeated bays, glazing bars, trusses and windows should
  be suitable for instancing. Use 6–18 large windows where the building has windows,
  1–4 chimneys where function requires them, and 3–8 large functional props.
- Every load path must be plausible: trusses land on columns or walls, cranes on rails or
  brackets, canopies on columns or brackets, chimneys on foundations, and rails and pipes
  in or on the ground. Nothing floats and no roof intersects another impossibly.
- The body is soot-darkened machine-made brick `#8E5F4E`, with thin even courses and
  pale dirty mortar. Soot is directional and uneven: sheltered areas darken while
  rain-washed areas stay readable. The scene must not become uniformly black.
- Dark slate and structural iron use `#3E4247`. Iron is slender and structural: columns,
  trusses, glazing bars, shutters, gantries, railings and pipes.
- Ground is pale neutral `#ECE4D3` outside the plot, with setts, engineering brick,
  cinder, rails and service aprons inside it. Rails are let flush into one ground surface.
- Glazing is divided sheet glass. Pitched roofs are slate unless a named glazed monitor,
  north light or ridge lantern replaces part of the roof.
- Industrial identity comes from large production volumes, repetitive arched bays,
  iron trusses, sawtooth or monitor roofs, loading doors, rails, pipes, cranes and modest
  smokestacks. Material texture may carry brick and slate detail; do not model hundreds
  of unique bricks, panes or fasteners.

## Era boundaries

**Earlier boundary — Early Modern:** do not use dominant buff plaster, rusticated merchant
fronts, ornate shaped gables, oriels, cupola-led civic compositions or hand-made variation.
Use repetitive brick bays, exposed iron structure and engineered roof forms instead.

**Later boundary — Atomic:** do not use poured concrete slabs, unsupported cantilevers,
ribbon glazing, curtain walls, plate-glass sheets, streamlined forms, radar dishes,
nuclear symbols or pristine white modernism. Use bracketed projections, divided glazing,
brick piers and visible iron trusses instead.

**Later still:** no neon, emissive strips, giant ducts, sealed composite skins or
futuristic machinery. Light comes from a visible flame in glass or a firebox and does not
cast a stylized glow across the plot.

## Canonical census

### Skill buildings

| Order | Output | Node | Display name | Mass | Plot | Relative height |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `fun-1-spinning-mill.png` | `FUN.1` | the Spinning Mill | `hall` | 2×2 | hall band; level with Exhibition Hall |
| 2 | `fun-7-exhibition-hall.png` | `FUN.7` | the Exhibition Hall | `hall` | 2×2 | hall band; level with Spinning Mill |
| 3 | `fun-2-cotton-warehouse.png` | `FUN.2` | the Cotton Warehouse | `store` | 2×1 | below halls, above workshops |
| 4 | `fun-3-locomotive-shop.png` | `FUN.3` | the Locomotive Shop | `workshop` | 2×1 | lower roofed skill band |
| 5 | `fun-8-cannon-factory.png` | `FUN.8` | the Cannon Factory | `workshop` | 2×2 | lower roofed skill band |
| 6 | `pol-5-water-tower.png` | `POL.5` | the Water Tower | `tower` | 2×2 | tallest object in the era |

### Town Hall

| Order | Output | Runtime id | Display name | Plot | Relative height |
| --- | --- | --- | --- | --- | --- |
| 7 | `townhall-industrial-engine-house.png` | `town-hall` | the Engine House | 3×2 | chimney second only to `POL.5` |

### Civic buildings

| Order | Output | Stable id | Role | Display name | Plot | Civic height |
| --- | --- | --- | --- | --- | --- | --- |
| 8 | `civic-food-works.png` | `industrial_cold_store` | food | The Food Works | 2×2 | third |
| 9 | `civic-workers-houses.png` | `industrial_workers_houses` | dwelling | The Workers' Houses | 2×1 | fourth / lowest |
| 10 | `civic-railroad-station.png` | `industrial_public_baths` | amenity | The Railroad Station | 2×2 | second |
| 11 | `civic-library.png` | `industrial_library` | blend | The Library | 1×1 | first / tallest |

The order above is the image and JSONL order. It follows the guide's visual roster: shared
hall pair, store, shared workshop pair, tower, Town Hall, then civic catalogue order.

## Concise building descriptions

1. **the Spinning Mill** — A tall storeyed brick mill under one low slate pitch, with
   identical arched bays and a continuous divided-glass clerestory directly below the
   eaves. An iron column-and-beam grid carries the floors and roof. Line shafts, pulleys
   and belts visible through the clerestory are required. Keep the chimney attached and
   modest; do not give it the Exhibition Hall's raised ridge monitor.

2. **the Exhibition Hall** — One large rectangular iron-and-glass span over an undivided
   public room on a low brick plinth. Riveted trusses cross the whole width without an
   interior wall, under a glazed monitor running the ridge. The truss line visible through
   the glass is required. It is one tall room, not a storeyed working mill.

3. **the Cotton Warehouse** — A long, tall, multi-storey bonded warehouse under a shallow
   slate roof, with every arched opening closed by an iron shutter. Stacked loading doors
   and a bracket-supported hoist gantry mark the long street face. The visibly sealed
   elevation is required. Do not replace it with The Food Works' low canopy and roof vent.

4. **the Locomotive Shop** — One long tall erecting shed under a few large north-light
   sawtooth pitches, with full-height doors filling a gable. A bridge crane must run on
   supported gantry rails for the shop's full length, visible through the open doors;
   ground rails continue onto a loading apron and turntable. Keep it a long crane bay,
   not the Cannon Factory's square casting house.

5. **the Cannon Factory** — A tall square single-volume casting house plus a lower glazed
   boring range along one flank. The main slate roof carries a ridge lantern and one short
   cupola furnace flue. A wide open gable reveals a sunken casting pit, moulding boxes and
   a bracketed wall crane; horizontal cold barrels sit in supported boring beds. Nothing
   is aimed, mounted, loaded or firing.

6. **the Water Tower** — A large cylindrical riveted-iron tank with a shallow conical cap
   stands on a visibly supported, cross-braced iron stage above a tall faceted brick shaft.
   The shaft rises from a broad low brick pump house; heavy pressure pipes climb its face,
   enter the pump house and turn across the plot through plausible elbows and valve bodies.
   Tank, stage, shaft, pump house and grounded pressure pipes are required. No clock,
   rectangular head machinery or unsupported tank.

7. **the Engine House** — A grand symmetrical municipal complex: a monumental central
   civic block and broad stair, two lower flanking wings, and a taller glazed engine hall
   rising behind them under a roof monitor. A great divided-glass arch reveals the engine
   machinery and flywheel. A restrained tapering brick chimney rises behind one wing as a
   clear landmark without replacing the civic façade. The central block, wings, engine
   hall and chimney are required as one connected municipal composition.

8. **The Food Works** — A medium brick cold store under slate, with a louvred vent tower
   above the roof and a long covered dock beside a short siding. An exterior ice hoist and
   large churns and food crates under the canopy are required. The canopy is carried on
   iron columns; visible timber is limited to its functional dock deck and cargo.

9. **The Workers' Houses** — Four identical two-storey terraced-house bays under one
   unbroken slate roof, with one door and one divided sash window per bay and chimney
   stacks in a ridge rhythm. A shared rear court with washing and privies is required.
   Show maintenance and dignity: intact glazing, fresh doors, swept paving and planting,
   with no squalor or soot-streaked housing.

10. **The Railroad Station** — A tall arched iron-and-glass train shed springs from a low
    brick plinth and remains open at the near gable, with a platform and waiting tank
    engine visible through it. A modest brick booking hall attaches without blocking the
    arch; its clock has no numerals. The open shed mouth, supported canopy and passenger
    use are required. It is neither a closed goods store nor an enclosed monitor-roof hall.

11. **The Library** — A narrow three-storey brick building on one tile, under a shallow
    slate roof and entered through one plain stone doorcase. Window sizes diminish by
    storey: tall reading-room windows, smaller lecture-room windows, then the smallest
    stack openings. That vertical window order and the visible reading room are required.
    Keep it a single tall civic building, not a terrace or long arcaded school.

## Prompt source

`era07-industrial-concepts.jsonl` is the durable generation source. It contains exactly
eleven standalone objects using the established keys:

`out`, `size`, `quality`, `use_case`, `prompt`

Each row names one canonical output, uses `1024x1024`, `high`,
`stylized-concept`, includes only positive live palette hexes, and carries its own
physical, collision and no-text constraints.

## Generation and review outcome

All eleven canonical images were accepted from the first built-in generation pass.
No second pass was needed. Each was inspected at 1024×1024 and in a 128×128 grayscale
reduction before installation.

| Image | First pass | Second pass |
| --- | --- | --- |
| `fun-1-spinning-mill.png` | accepted: clerestory, mill bays, line shafting and attached chimney read at both sizes | not needed |
| `fun-7-exhibition-hall.png` | accepted: open iron-and-glass span, ridge monitor and visible trusses stay distinct | not needed |
| `fun-2-cotton-warehouse.png` | accepted: long shuttered cliff, stacked doors and supported gantry read clearly | not needed |
| `fun-3-locomotive-shop.png` | accepted: long sawtooth crane bay, open gable, rails and turntable are physically coherent | not needed |
| `fun-8-cannon-factory.png` | accepted: square casting house, pit, ridge lantern and glazed boring range separate cleanly | not needed |
| `pol-5-water-tower.png` | accepted: riveted cylindrical tank, supported iron stage, faceted shaft, pump house and grounded pressure pipes read clearly | not needed |
| `townhall-industrial-engine-house.png` | accepted: grand central civic block, paired wings, glazed engine hall and restrained landmark chimney read as one municipal complex | not needed |
| `civic-food-works.png` | accepted: roof vent, supported dock, ice hoist, churns and siding identify the cold store | not needed |
| `civic-workers-houses.png` | accepted: four maintained bays, chimney rhythm and clean rear court remain legible | not needed |
| `civic-railroad-station.png` | accepted: open arched train shed, waiting tank engine and passenger platform are unmistakable | not needed |
| `civic-library.png` | accepted: narrow three-storey mass and diminishing window order survive grayscale reduction | not needed |

## Source decisions and live contradictions

- The previous README mixed live and superseded history. Its compressed Cannon Factory
  paragraph still described the retired Pattern Shop. This handoff uses the latest explicit
  style-guide amendment: gun foundry plus boring range.
- The previous README said Era 7 footprints were decided but unwired. That is stale.
  `NODE_FOOTPRINTS` now carries all six Era 7 skill nodes: `FUN.2` and `FUN.3` are 2×1;
  `FUN.1`, `FUN.7`, `FUN.8` and `POL.5` are 2×2.
- The product ruling sets `POL.5` to the accepted tank-based **Water Tower** asset:
  riveted tank, supported iron stage, tall brick shaft, pump house and pressure pipes.
  The roster id, name and footprint stay unchanged.
- The product ruling also makes the Town Hall a **grand municipal Engine House**, not the
  compact form previously described. Its accepted body is the central civic block,
  flanking wings, glazed engine hall and restrained landmark chimney; the runtime id,
  name and footprint stay unchanged.
- The skill guide says timber disappears from elevations, while the civic guide explicitly
  requires a timber dock for The Food Works and sash timber for The Workers' Houses.
  The more specific civic descriptions govern those two civic details; skill buildings
  show no exterior timber.
- The style guide gives height as a rank over mass/reference forms, not world units. This
  handoff preserves the usable order and does not invent dimensions. Civic heights retain
  their own explicit order: Library, Railroad Station, Food Works, Workers' Houses.
- The Railroad Station guide asks for confident lettering and a departure board, while
  this concept set's no-text/no-glyph contract is stricter. The image keeps the clock and
  passenger function but omits lettering, numerals and board text.
- The palette section still carries a `PROPOSED` status label. `#8E5F4E` body and
  `#3E4247` accent are nevertheless the current values parsed by the live palette guard
  and are the values used here; this handoff does not claim a later ratification.

## Reference anchors

- Textile mills: multi-storey repetitive bays, cast-iron columns and beams, brick
  fireproof floors, slate roofs and tall chimneys are documented in Historic England
  listings and the Salford Twist Mill survey.
- Train sheds: St Pancras and Newcastle Central establish the large iron-rib-and-glass
  clear span over platforms, structurally distinct from the masonry booking buildings.
- Municipal waterworks: elevated riveted tanks, masonry shafts, pump houses and large
  pressure mains establish a legible tank-to-pump-to-pipe load path.
- Municipal engine houses: monumental entrance blocks, flanking service wings, glazed
  machinery halls and restrained chimneys establish the civic industrial landmark.
- Gun foundries: the ASME and National Park Service West Point Foundry records identify
  separate moulding/casting work, cupola furnaces, rail handling and horizontal boring
  beds as the visible functional sequence.

## Primary repository sources

- `docs/superpowers/specs/eras/era-07-industrial/style-guide.md`
- `docs/superpowers/specs/eras/era-07-industrial/civic-buildings.md`
- `packages/skill-graph/src/eras.ts`
- `apps/web/src/city/worldLayout.ts`
- `packages/economy/src/civicCatalogue.ts`
- `test/eraPaletteLadder.test.ts`
- `docs/superpowers/specs/eras/era-06-early-modern/`
- `docs/superpowers/specs/eras/era-08-atomic/`
