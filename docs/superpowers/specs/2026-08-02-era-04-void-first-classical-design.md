# Era 4 void-first Classical architecture

**Date:** 2026-08-02  
**Status:** APPROVED DESIGN DIRECTION, awaiting review of this written record.  
**Decision:** Move Era 4 to a void-first Hellenistic/Roman port-city grammar while
keeping Era 6 as wall-first Italian Renaissance architecture.  
**Measured at:** `1481fe54` on `evan/city-population-happiness`.  
**Scope:** Design documentation only. This document authorizes no implementation,
prompt edit, image generation, asset installation, runtime wiring, commit, or push.

---

## 0. The decision in one sentence

**Era 4 is a Roman Mediterranean port city with a Hellenistic public-space
inheritance: open courts, quays, stoas, freestanding colonnades, and deep structural
vaults dominate its plots. Era 6 remains an Italian Renaissance street city: compact
palazzi, regular storeys, rusticated bases, deep cornices, lead roofs, domes, cupolas,
and composed wall elevations dominate its plots.**

This is a distinction in massing and plan, not a palette correction. It must remain
legible when every image is desaturated, reduced to a 128 px thumbnail, and shown
without a label.

---

## 1. Problem statement, verified against the current tree and candidate art

### 1.1 Repository state

The two eras do not currently have equivalent artifact states:

- The ten Era 4 PNGs are present under
  `output/imagegen/era-04-classical-building-briefs/`, but they are **untracked** at
  this tip. `git status --short` reports each as `??`. Their tracked prompt set landed
  in `27f15695`; `e4fb8793` corrected four recorded marginal results, and `9de801cb`
  closed the remaining Baths chimney loophole.
- The eleven Era 6 PNGs under
  `output/imagegen/era-06-early-modern-building-briefs/` are tracked and remain the
  peach-wall, terracotta-roof set added by `6bf3c188`.
- `fba5f059` changed Era 6's style guide, civic guide, image-generation README, and
  JSONL prompts to rose intonaco `#D29F9F` and lead roofs `#8A9199`. It did **not**
  replace a PNG. `git diff --name-status 6bf3c188..1481fe54 --` over that image folder
  lists only the README and JSONL.
- The Cursor delivery assets contain eight genuinely different rose/lead candidate
  rerenders: the City Hall, Covered Market, Observatory, Lecture Theatre, Merchant
  Houses, Printing House, Drawing Office, and Painters' School.
- The three remaining asset-folder files exist, but they are not replacement renders:
  Mapmakers' House, Cannon Tower, and Town Square are byte-identical to the tracked
  `6bf3c188` PNGs.

The eight changed candidates prove the palette correction is insufficient. They
retain the same square domed hall, half-round domed hall, long glazed bar, three-storey
printing block, wide civic palazzo, open arcade shed, tall courtyard palazzo, and
two-storey arcaded school. Rose walls and lead roofs improve colour separation, but
the silhouettes, plans, roof ratios, height bands, and plot occupancy remain the same.

### 1.2 The repeated families

Every current image belongs to one of four shared massing families, except Era 6's
squat circular gun platform:

| Shared family | Current Era 4 members | Current Era 6 members | Collision at thumbnail size |
| --- | --- | --- | --- |
| Shallow-roofed repeated-bay range | `POL.1`, `POL.2`, `POL.4` | `GEO.2`, Covered Market, Painters' School, `CG.1`'s loggia | A long rectangle plus evenly spaced supports or openings |
| Regular enclosed masonry block | `POL.8`, food civic, dwelling civic | `POL.6`, Merchant Houses, City Hall | Stacked wall bays under a neat shallow cap or cornice |
| Monumental Classical hall | `POL.3`, amenity civic | `GEO.1`, `POL.7` | Symmetry, arches, apses or domes, and a formal entrance |
| Open paved court | the hub, blend civic | `CG.1`, Town Square | Mostly paving, a low colonnaded edge, and one central feature |

The revised Era 6 prompts attempt to separate the eras with round columns versus
square piers, pilasters versus engaged shafts, and glazed panes versus dark openings.
Those are valid secondary distinctions, but they collapse into the same repeated
vertical rhythm at 128 px. Glass, surface hue, small ornament, and connoisseur detail
cannot be the primary era test.

### 1.3 Why the correction belongs in Era 4

Renaissance architecture deliberately revived Roman columns, round arches, vaults,
orders, and domes. Two sets described only as "Classical details on pale masonry" will
therefore converge. The historically meaningful distinction is how those forms compose
a city:

- Greek and Roman civic life occupied agoras, forums, stoas, porticoes, open exercise
  courts, quays, and large structural interiors. Columns and vaults carried loads, and
  open space was part of the institution.
- Italian Renaissance urban architecture organized compact palazzi into regular
  storeys and continuous street façades. The Classical order was often applied to a
  composed wall, while rustication, a deep cornice, a cortile, and a domed crown
  established hierarchy.

Moving Era 6 north would create steep gables, towers, dormers, and chimney forests,
which would collide with Era 5's steep, jettied, tower-heavy roofscape and begin
foreshadowing Era 7's brick and chimney rhythm. Moving Era 4 creates the stronger
separation from all three neighbours.

---

## 2. Scope and non-goals

### 2.1 In scope

One future implementation unit may:

1. Reconcile Era 4's style guide and civic guide with this approved grammar.
2. Rewrite the Era 4 image-generation README and its ten JSONL prompts.
3. Generate and review one replacement concept image for each of the ten canonical
   Era 4 outputs.
4. Install an accepted ten-image set into the existing canonical Era 4 folder.
5. Produce the acceptance evidence defined in section 8.

This is one implementation plan because all ten outputs share one common visual
grammar, one source-document pair, one prompt set, one canonical folder, and one
acceptance gate.

### 2.2 Explicit non-goals

This design does **not**:

- change any lesson roster, node ID, civic ID, display name, stable name, subtitle,
  mass assignment, civic role, capacity contribution, price, or acquisition rule;
- change any skill or civic footprint;
- change the authored relative height order;
- redesign Era 6, revise its rose/lead ruling, or resolve its three incomplete
  replacement renders;
- redesign Era 3, Era 5, or any other era;
- wire a runtime GLB, change `buildingAssets.ts`, change `worldLayout.ts`, or change
  runtime placement and contain-fit behaviour;
- author `site` or `construction` stages; the concept set remains the finished
  `built` stage;
- alter the Era 4 body hue, roof hue, lighting model, camera, plot scale, or
  three-tone rendering convention;
- use glass, colour, inscriptions, fine ornament, props, or labels as the only
  separator between eras;
- alter `TEAM_CHECKLIST.md`, `work-log/`, Era 3 assets, or port 5174.

### 2.3 Frozen contracts

The implementation must preserve all of these:

- `INV-ERA-1`: the cells occupied by each building do not move.
- The mesh includes the designed court, apron, lane, or quay and still fills 95% of
  the footprint span. "Void-first" never means scaling a small object down and leaving
  accidental padding around it.
- Height is a relative order, not a world-unit target. The order remains:
  `classical_apartment_block`, `classical_baths`, `POL.3`, `town-hall`,
  `POL.1`/`POL.8` in the same low workshop band, `classical_public_granary`,
  `POL.4`, `classical_fountain`, then `POL.2`.
- `POL.1` may have marginally higher eaves than `POL.8`, but neither leaves their
  shared low workshop band.
- `POL.2` remains the shortest roofed Era 4 building.
- `classical_fountain` remains above `POL.2` and below `POL.4`; its water wall, rather
  than a tree, supplies that position.
- Every side must read under the full 360° orbit.
- Existing anti-rebus constraints remain binding.

Form may be re-authored inside those contracts. The existing conversions of `POL.2`
to a barracks and Era 6's `RAT.5` to a cannon tower establish that precedent: form can
move while ID, mass, and footprint stay fixed.

---

## 3. Era-wide visual grammar

### 3.0 Measurement vocabulary

The following terms are acceptance measurements, not mood words:

- **Plan percentage** is measured in top-down projection inside the frozen footprint,
  including authored ground, court, lane, pool, and quay geometry.
- **Open-to-sky** means a continuous plan region with no roof, bridge, balcony, or
  upper floor over it. A colonnade beside it does not reduce its area.
- **Shallow roof** means the vertical rise from eaves to crown or ridge is no more
  than 25% of the supporting wall height beneath those eaves.
- **Deep vault mouth** means the oblique view exposes an interior reveal at least
  half as deep as the mouth is wide.
- **Broad hipped roof** means one roof covers more than half the plot and slopes on
  three or four sides.
- **Regular multi-storey façade** means three or more complete opening rows share the
  same bay centres from ground to cornice across at least three-quarters of one
  elevation.
- **Narrow high-rise** means the visible wall height exceeds the width of the short
  façade. Only the dwelling civic may satisfy that relation.

Where section 5 supplies a stricter percentage or relation, section 5 wins.

### 3.1 Aggregate rule

Era 4 is **void-first**:

- Seven named plots in section 5 must devote at least one-third of their plan to a
  continuous, functional, open-to-sky region.
- Roofed mass is organized as narrow bars, lean-tos, split ridges, or vault jackets.
  No Era 4 output may use one broad hipped cap over a square or wide plot.
- Open structural rows use freestanding columns carrying a straight entablature.
- Arches are deep load-bearing vault mouths, apses, aqueduct work, or niches. A thin
  decorative arcade screen under a shallow roof belongs to Era 6.
- The skyline is low and horizontal except for one irregular urban dwelling stack.
  Monumentality comes from width, vault mass, and open courts rather than a crown.
- There is no dome on a drum, lantern, cupola, turret, or regular chimney rhythm.

Era 6 remains **wall-first**:

- Its principal halls and civic landmarks are compact, roofed, composed volumes.
- The Printing House, Merchant Houses, and City Hall provide uninterrupted regular
  multi-storey street walls.
- Its open outdoor rooms use round-headed arcades on square piers.
- Its walls are counted with applied pilasters, regular glazed openings, rusticated
  bases, string courses, and deep cornices.
- Two domes with lanterns and the City Hall cupola/chimney crown own the skyline.

### 3.2 The distinction in one comparison

| Axis | Era 4: void-first ancient | Era 6: wall-first Renaissance |
| --- | --- | --- |
| Plan | Court, quay, lane, pool, or assembly apron is load-bearing | Compact block or formally bounded piazza is load-bearing |
| Elevation | Freestanding support or thick vault | Composed wall with applied order |
| Roof | Split bars, lean-tos, vault jackets, or none | Broad lead planes, domes, cupolas, parapets |
| Height | One irregular dwelling high point; broad civic shoulders | Several regular palazzi plus three crowned landmarks |
| Openings | Unglazed voids, shutters, grilles, deep mouths | Repeated composed glazed windows |
| Urban read | Institutions stand around usable open space | Buildings establish a continuous designed street edge |

### 3.3 Historical basis

The design uses architectural properties that survive a low-poly isometric renderer:

- **H1:** [Smarthistory, “The Athenian Agora and the experiment in democracy”](https://smarthistory.org/the-athenian-agora-and-the-experiment-in-democracy/)
  establishes the agora as public civic space and the stoa as a place for business,
  political discussion, and civic life.
- **H2:** [Vitruvius, *On Architecture*, Book V](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Vitruvius/5%2A.html)
  gives the basilica's long proportion and describes palaestrae as square or oblong
  peristyles with open exercise space and adjoining bath rooms.
- **H3:** [Smarthistory, “An introduction to ancient Roman architecture”](https://smarthistory.org/roman-architecture/)
  identifies concrete, true arches, vaults, forums, basilicas, insulae, aqueducts,
  fountains, and bath-gymnasium complexes as Roman urban systems.
- **H4:** [English Heritage, “The Mysterious Absence of Stables at Roman Cavalry Forts”](https://www.english-heritage.org.uk/visit/places/chesters-roman-fort-and-museum-hadrians-wall/history/absence-of-stables/)
  records conventional barrack blocks divided into repeated contubernia and officers'
  rooms at the end.
- **H5:** [Ostia Antica, “The warehouses (horrea)”](https://ostia-antica.org/dict/topics/horrea/intro.htm)
  records raised floors, long rows of cellae, ramps, thick walls, few entrances, and
  storage rooms arranged around a courtyard or along a corridor.
- **H6:** [Smarthistory, “Roman domestic architecture: the insula”](https://smarthistory.org/roman-domestic-architecture-insula/)
  records multi-storey urban apartments, commercial street fronts, open light courts,
  and four-storey examples at Ostia.
- **H7:** [Smarthistory, “Baths of Caracalla”](https://smarthistory.org/baths-of-caracalla/)
  records open-air palaestrae, a massive groin-vaulted frigidarium, an open natatio,
  and a complex of differentiated bathing volumes.
- **H8:** [University of Chicago, “Curia”](https://penelope.uchicago.edu/encyclopaedia_romana/romanforum/curia.html)
  records the Senate chamber's broad stepped seating and the Curia's position in the
  civic landscape of the Forum.
- **H9:** [Smarthistory, “Michelozzo, Palazzo Medici”](https://smarthistory.org/michelozzo-medici-palace/)
  identifies the fortress-like rusticated base, massive cornice, and internal
  courtyard of the Florentine palazzo.
- **H10:** [UNESCO, “City of Vicenza and the Palladian Villas of the Veneto”](https://whc.unesco.org/en/list/712/)
  describes Renaissance palazzi fitted into the urban fabric as continuous street
  façades articulated by classicism.

H1 through H8 support Era 4's redesign. H9 and H10 define the Era 6 morphology that
Era 4 must stop sharing.

---

## 4. Rules shared by every Era 4 prompt

Every rewritten prompt must state these rules positively before its prohibitions:

1. One finished low-poly isometric building, one view, one continuous plot, no labels,
   no comparison panel, and no variant sheet.
2. Use the locked three-quarter overhead camera at approximately 49° tilt and 45°
   azimuth, with the whole plot visible, and keep the current plot dimensions.
3. The building plus its authored court, apron, lane, pool, or quay fills 95% of the
   footprint span.
4. Describe the silhouette, plan, roof, structural system, and required thumbnail
   read before materials or props.
5. Pale ashlar/stucco and terracotta tile remain secondary identifiers. The image must
   pass in grayscale.
6. Freestanding columns carry straight entablatures. Any arch is visibly deep and
   structural rather than a thin arcade screen.
7. No broad hipped palazzo roof, rusticated ground-storey band, applied pilaster grid,
   deep bracketed palazzo cornice, regular glazed window grid, dome on a drum, lantern,
   cupola, turret, or regular chimney rhythm.
8. No exposed Medieval timber frame, pointed arch, buttress, jetty, steep roof, spire,
   machine-made unit, structural iron, sawtooth roof, industrial chimney, or soot.
9. No legible or pseudo-legible text, numerals, glyphs, mathematical diagrams, or
   lesson rebuses.
10. Every prohibition names the legal alternative in the same sentence.

An attractive image that violates one of these rules is a failed image.

---

## 5. Canonical per-building redesign

This section is the complete census: five skill buildings, one hub, and four civic
buildings. Every row preserves its existing ID, name, role or mass, footprint, and
height contract.

### 5.1 `POL.1` — the Stonecutters’ Shop

- **Contracts:** `workshop`; 2×2; low workshop band, level with `POL.8`; canonical
  output `pol-1-stonecutters-shop.png`.
- **Current failure:** A full-depth rectangular shop behind a full-width colonnade
  reads as the same shallow-roofed repeated-bay family as Era 6's market and school.
- **New archetype:** An open stoa workshop.
- **Silhouette and plan:** A roofed rear strip occupies one-third of the plot. A
  continuous open work court occupies the front two-thirds. One straight colonnade
  marks the boundary; a short return of no more than one bay prevents a temple front.
- **Roof:** One shallow terracotta shed roof slopes from the rear wall to the front
  entablature. No ridge crosses the plot.
- **Structural system:** Freestanding round stone columns carry a straight
  entablature and the timber roof. The rear work wall is load-bearing.
- **Required thumbnail detail:** The open work court is visibly larger than the
  roofed strip, and work crosses the column line onto the court.
- **Regression bans:** No full-depth box, arch arcade, hip roof, applied pilaster
  façade, temple cella, fire, or rectangular array of blocks.
- **Historical basis:** H1's stoa as a civic and commercial covered edge; H3's Roman
  porticoes and working forum fabric.

### 5.2 `POL.2` — the Barracks

- **Contracts:** `yard`; 2×1; shortest roofed Era 4 building; canonical output
  `pol-2-barracks.png`.
- **Current failure:** The long one-storey arcade under one shallow ridge is almost
  the same silhouette as Era 6's covered market.
- **New archetype:** A Roman contubernia range and drill strip.
- **Silhouette and plan:** The cell range and veranda occupy 45% of the long plot
  along one edge. A bare open drill strip occupies the other 55%. The building is one
  room deep and has one terminal officers' room.
- **Roof:** One low-pitched terracotta gable covers the cell bar only. Its ridge is
  straight and uninterrupted.
- **Structural system:** A row of short freestanding round columns carries a straight
  veranda beam in front of a load-bearing cell wall. Square-headed doors sit behind
  the columns.
- **Required thumbnail detail:** One line of doors faces a drill strip wider than the
  veranda and cells.
- **Regression bans:** No round arcade, second storey, second row of cells, returning
  wing, paved drill grid, gate tower, parapet, crenellation, or pediment.
- **Historical basis:** H4's conventional contubernia barrack blocks and terminal
  officers' rooms.

### 5.3 `POL.3` — the Custom’s House

- **Contracts:** `hall`; 2×2; third in the Era 4 height order; canonical output
  `pol-3-customs-house.png`.
- **Current failure:** The current enclosed pedimented basilica reads as a monumental
  Renaissance hall when reduced to its outer mass.
- **New archetype:** An open forum basilica used for customs and port business.
- **Silhouette and plan:** A raised narrow nave runs to a half-round apse. Lower open
  aisles expose the nave along both long sides. A shallow entrance forecourt separates
  the approach from the hall; the mass is broad and axial, not a compact cube.
- **Roof:** One narrow pitched terracotta nave roof, two lower aisle lean-tos, and one
  half-conical tiled apse roof.
- **Structural system:** Two internal column rows carry the clerestory walls; outer
  aisle columns carry straight entablatures; the apse is load-bearing masonry.
- **Required thumbnail detail:** The clerestory stripe, both lower open aisles, and the
  terminal apse survive simultaneously at 128 px.
- **Regression bans:** No palace façade, dome, drum, lantern, rusticated storey,
  regular glazed window grid, deep palazzo cornice, tall closed entrance wall, or blank
  rear.
- **Historical basis:** H2's long forum basilica proportions and H3's basilica as a
  Roman civic building.

### 5.4 `POL.4` — the Wine Cellars

- **Contracts:** `store`; 2×1; below the food civic and above the blend civic;
  canonical output `pol-4-wine-cellars.png`.
- **Current failure:** A thin row of arches beneath a continuous shallow roof reads as
  another Renaissance market loggia.
- **New archetype:** A half-sunken row of vaulted horreum wine cellae.
- **Silhouette and plan:** Four adjacent deep storage chambers occupy 70% of the long
  plot. A loading lane occupies the remaining 30%. The chamber floors sit below the
  lane, so the vault crowns rise from a low retaining terrace.
- **Roof:** Terracotta follows each of the four barrel-vault crowns. There is no
  continuous gable, hip, or ridge.
- **Structural system:** Thick masonry cross-walls and four true barrel vaults carry
  the weathering layer. The arched mouths are deep chambers, not openings in a screen.
- **Required thumbnail detail:** At least one side wall and the oblique camera expose
  the full depth of the vaults and the thickness of the cross-walls.
- **Regression bans:** No thin arcade, freestanding arcade piers, upper storey,
  continuous pitched cap, window grid, open display of goods, four-sided bay
  arrangement, or isolated fifth bay.
- **Historical basis:** H5's long rows of storage cellae and corridor layouts; H3's
  Roman structural use of barrel vaults.

### 5.5 `POL.8` — the Surveyor’s Shop

- **Contracts:** `workshop`; 2×2; same low workshop band as `POL.1`; canonical output
  `pol-8-surveyors-shop.png`.
- **Current failure:** The current compact hipped box is a small palazzo in all but
  colour.
- **New archetype:** A groma court with an L-shaped taberna and portico.
- **Silhouette and plan:** Roofed rooms and portico occupy no more than 45% of the
  plot along two adjacent edges. A continuous open setting-out court occupies at least
  55%, with two full sides open to the street.
- **Roof:** Two shallow terracotta lean-tos meet at the internal corner of the L. No
  roof spans the open court.
- **Structural system:** Load-bearing rear walls and freestanding round columns under
  straight entablatures. The court is the working floor.
- **Required thumbnail detail:** The L and its open court remain readable without the
  groma or any other prop.
- **Regression bans:** No compact square block, hip roof, applied pilaster rhythm,
  regular window grid, rusticated base, deep cornice, full bilateral symmetry,
  coordinate axes, quadrants, tick marks, or regular paving grid.
- **Historical basis:** H1's stoa-framed civic space and H3's Roman forum, surveying,
  and portico vocabulary.

### 5.6 `town-hall` — the Senate House

- **Contracts:** hub; 3×2; fourth in the height order and monumental by width;
  canonical output `townhall-classical-senate-house.png`.
- **Current failure:** A rectangular peristyle court with a central feature reads as
  the same plan as an Italian piazza or formal Renaissance loggia court.
- **New archetype:** A rear Curia facing an open Comitium assembly apron.
- **Silhouette and plan:** A simple council hall occupies the rear 35% of the plot. A
  broad curved stepped assembly apron occupies the front 65%. The public hearth stands
  on the centre axis between the lowest step and the hall entrance.
- **Roof:** One shallow terracotta gable covers the rear hall. No perimeter roof
  encloses the apron.
- **Structural system:** Load-bearing Curia walls and timber truss; solid masonry
  assembly steps; a small straight-column entrance porch no deeper than one bay.
- **Required thumbnail detail:** The curved bank of steps and central visible hearth
  read as one civic composition.
- **Regression bans:** No four-sided peristyle, formal rectangular piazza, fountain,
  statue, cupola, tower, multi-storey palazzo front, rusticated base, chimney rhythm,
  or roofed centre.
- **Historical basis:** H8's stepped Senate chamber and Curia; H3's Forum as a
  connected landscape of civic institutions.

### 5.7 `classical_public_granary` — The Grain Dock

- **Contracts:** civic `food`; 2×2; below the workshop band and above `POL.4`;
  canonical output `civic-grain-dock.png`.
- **Current failure:** One broad hipped masonry box with repeated doors reads as a
  Renaissance warehouse or modest palazzo.
- **New archetype:** An Ostian horreum compound opening to a quay.
- **Silhouette and plan:** Two parallel storage bars each occupy 30% of the plot. A
  straight open loading lane from street to quay occupies the central 40%. Both bars
  stand on solid vented sleeper walls.
- **Roof:** Two independent low terracotta gables with a full-width strip of open sky
  between them.
- **Structural system:** Thick load-bearing storage walls, timber raised floors,
  sleeper-wall vents, and timber trusses. The quay edge and lane are part of the asset.
- **Required thumbnail detail:** Daylight runs through the central loading lane, and
  the two vent bands remain visible below the storage floors.
- **Regression bans:** No monolithic block, hip roof, upper storey, decorative
  arcade, regular window grid, deep cornice, open gap beneath the whole floor, or
  single broad façade.
- **Historical basis:** H5's raised horreum floors, long cellae, ramps, and
  courtyard/corridor storage plans.

### 5.8 `classical_apartment_block` — The Cottages

- **Contracts:** civic `dwelling`; 1×2; tallest Era 4 building; canonical output
  `civic-cottages.png`.
- **Current failure:** One clean vertical slab with repeated openings reads as a
  narrow Renaissance palazzo.
- **New archetype:** An Ostian insula made of multiple visible dwelling units.
- **Silhouette and plan:** Two unequal three- and four-storey wings occupy the long
  strip and are separated by an open stair/lightwell notch. Shops face the short street
  end; external galleries and stairs wrap the notch. The four-storey wing preserves
  the authored high point.
- **Roof:** Two offset low-pitched terracotta roofs at unequal elevations. No single
  roof or cornice closes the whole strip.
- **Structural system:** Load-bearing masonry lower walls, lighter upper masonry,
  timber floors, external stone stair flights, and shallow timber galleries.
- **Required thumbnail detail:** Open sky cuts through the mass at the lightwell, and
  the two wings end at visibly different heights.
- **Regression bans:** No symmetric façade grid, level palazzo cornice, rusticated
  ground band, hip roof, sealed slab, central carriage arch, dome, or repeated
  identical balconies.
- **Historical basis:** H6's multi-storey insulae, commercial street fronts, open
  light courts, and documented four-storey examples.

### 5.9 `classical_baths` — The Baths

- **Contracts:** civic `amenity`; 3×2; second in the Era 4 height order; canonical
  output `civic-baths.png`.
- **Current failure:** A dome, monumental hall, and peristyle place the current image
  directly in the same family as both Renaissance domed halls.
- **New archetype:** An axial thermae campus defined by a transverse-vault hall and an
  open palaestra/natatio.
- **Silhouette and plan:** A frigidarium of three transverse vault bays occupies the
  rear half. Lower apsidal hot rooms occupy one side. An open exercise and pool court
  occupies at least 40% of the whole plot and remains open on the approach side.
- **Roof:** Three tile-jacketed transverse vault crowns over the frigidarium; low
  lean-to service roofs; no hemispherical roof.
- **Structural system:** Heavy masonry piers carry three groin-vaulted bays. The hot
  rooms use low half-domes or apses contained below the frigidarium shoulders; none
  becomes an exterior dome.
- **Required thumbnail detail:** Three transverse vault shoulders and the large open
  pool/exercise court read together.
- **Regression bans:** No exterior dome of any kind, drum, lantern, single long
  barrel roof, Renaissance loggia screen, palace façade, broad hip roof, regular
  window grid, or chimney stack.
- **Historical basis:** H7's open-air palaestrae, groin-vaulted frigidarium, and open
  natatio; H2's peristyle exercise court adjoining differentiated bath rooms.

### 5.10 `classical_fountain` — The Fountain

- **Contracts:** civic `blend`; 1×1; above `POL.2` and below `POL.4`; canonical output
  `civic-fountain.png`.
- **Current failure:** A small paved basin beside a short arcade reads as a miniature
  Renaissance piazza and loggia.
- **New archetype:** An aqueduct-terminal street fountain with a solid water wall.
- **Silhouette and plan:** A solid three-niche water wall and attached trough occupy
  the rear 25% of the plot. An open public apron occupies the front 75%. In
  footprint-normalized side-by-side thumbnails, the wall top is visibly above
  `POL.2`'s ridge and visibly below `POL.4`'s vault crowns.
- **Roof:** None.
- **Structural system:** A gravity-fed channel enters the wall, divides to three deep
  outlets, fills one long trough, and exits through a cut overflow channel.
- **Required thumbnail detail:** Channel, wall, three outlets, trough, and overflow
  form one physically continuous water path.
- **Regression bans:** No freestanding tiered basin, statue, loggia, radial or
  geometric piazza paving, roof, windlass, floating pipe, or trees carrying the height
  contract.
- **Historical basis:** H3's aqueduct-fed Roman city, connective fountains, and
  engineered public water system.

---

## 6. Collision checks

### 6.1 Era 3: Bronze Age

Era 3 is the only earlier era with meaningful structural collision risk. Its grammar
is mud-brick mass, corbelling, timber spanning, small lintelled openings, granular
ground, and no mortar or true vault.

| Era 4 member | Era 3 risk | Binary separator required |
| --- | --- | --- |
| `POL.1` | `LIN.3` is also an open-fronted workshop | Era 4 has a straight freestanding stone stoa and a two-thirds open court; Era 3 has hearths, smoke, a timber canopy, and no stone colonnade |
| `POL.2` | `LIN.5` is also a low working yard | Era 4 has one roofed contubernia bar plus a 55% drill strip; Era 3 is roofless ground with nothing above its weighing equipment |
| `POL.3` | `LIN.1` is another axial hall | Era 4 has a clerestory, two lower open aisles, and an apse; Era 3 has one low ridge and wide doors at both ends |
| `POL.4` | `LIN.4` is another sealed bonded store | Era 4 exposes four deep vault mouths and cross-walls; Era 3 presents one lintelled door in a blank mass |
| `classical_apartment_block` | the Era 3 dwelling is court-based | Era 4 is a notched vertical stack with a four-storey wing; Era 3 remains low around a horizontal court |
| `classical_baths` | the Era 3 steam building shares the role and 3×2 plot | Era 4 has three transverse vault shoulders plus a court covering at least 40%; Era 3 has one long vault and one side drying porch |

No Era 4 acceptance may depend on pale-versus-ochre colour to satisfy this table.

### 6.2 Era 5: Medieval

The separation is structural and must remain complete:

- Era 4 has zero pointed arches; Era 5 owns them.
- Era 4 has zero buttresses; Era 5 owns them.
- Era 4 has zero exposed timber-frame wall patterns; Era 5 owns them.
- Era 4 has zero jetties or oversailing storeys; Era 5 owns them.
- Era 4 has zero steep roof-dominant elevations, spires, or end-on street gables; Era
  5 owns them.
- Era 4's tall dwelling is split by a lightwell and external galleries, never by
  jetties or steep gables.

Any occurrence of one of those five Medieval forms is an automatic image failure.

### 6.3 Era 6: Early Modern

This is the primary collision this design closes:

| Axis | Era 4 required result | Era 6 retained result |
| --- | --- | --- |
| Open support | Round freestanding columns under a straight entablature | Round arches on square piers |
| Arch | Deep vault mouth, apse, niche, or aqueduct work | Shallow loggia or composed opening |
| Multi-storey wall | One irregular notched insula only | At least three regular wall-first palazzi |
| Roof | No broad hip and no crowned roof | Broad lead planes, two domes, one civic cupola |
| Court | Functional work, assembly, loading, water, or exercise void | Formal measured court, cortile, or piazza |
| Skyline | One narrow irregular high point; no crown | Dome, dome, and cupola/chimney crown |

The Era 6 candidate palette may improve the result, but this table must pass in
grayscale against the currently available imagery.

---

## 7. Image-generation and canonical-art policy

### 7.1 Authoritative text

The implementation must reconcile these four artifacts in this order:

1. `docs/superpowers/specs/eras/era-04-classical/style-guide.md`
2. `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md`
3. `output/imagegen/era-04-classical-building-briefs/README.md`
4. `output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl`

This design record owns the approved direction. The era guides own the product
contracts. The image-generation README must derive from both, and the JSONL must
derive from the README. A downstream artifact may add model-facing precision but may
not reverse an upstream decision.

### 7.2 Prompt census

The JSONL must contain exactly ten non-empty lines:

- exactly one line for every canonical output named in section 5;
- no duplicate `out` value;
- no output outside the canonical folder;
- 1024×1024, `quality: high`, and `use_case: stylized-concept`;
- one finished building and one view per line.

A mechanical census must compare the ten `out` values with section 5 in both
directions. A count alone is insufficient.

### 7.3 Canonical folder

`output/imagegen/era-04-classical-building-briefs/` is the sole canonical location
for the ten final Era 4 PNGs, their README, and their JSONL.

- Candidate runs go under
  `tmp/imagegen/era-04-void-first-candidates/`.
- Review contact sheets go under
  `tmp/imagegen/era-04-void-first-review/`.
- Cursor assets may transport a generated file but are never authoritative.
- A candidate is installed only after its hash, dimensions, and canonical filename
  have been checked.
- Installation replaces the canonical filename. It never creates `-final`, `-v2`,
  `-new`, `copy`, numbered alternatives, or a second canonical folder.
- No mixture of old and new Era 4 images is accepted as a completed set.
- This design does not change the current Git tracking policy for generated PNGs.
  Tracking or committing binaries requires its own explicit authorization.

Temporary candidates and contact sheets are evidence, not alternate sources of truth.

---

## 8. Acceptance and verification

### 8.1 Evidence setup

The final review population is all twenty-one images:

- the ten canonical Era 4 outputs from section 5;
- the eleven current or candidate Era 6 outputs with their canonical filenames.

Create two contact sheets from the same deterministic random order:

1. full-colour RGB thumbnails;
2. grayscale thumbnails produced mechanically from those same files.

Each tile is exactly 128×128 px, contains the whole image without a tighter crop, and
has no era, building, role, filename, or index label inside the tile. The sheet may put
a neutral tile number outside each image so reviewers can record answers. Use the
fixed shuffle seed `era04-era06-void-first-v1`, and use the identical tile order for
colour and grayscale.

Two reviewers classify each tile as Era 4 or Era 6 independently before seeing the
answer key or one another's answers.

**Pass:** both reviewers classify all 21 colour tiles correctly and all 21 grayscale
tiles correctly. One wrong classification is a failure. Review confidence is not a
substitute for the answer.

### 8.2 Binary aggregate rules

All six rules must pass:

1. **Skyline rule.** Era 4 has exactly one narrow high-rise silhouette, the dwelling
   civic. It has zero exterior domes, drums, lanterns, cupolas, turrets, and regular
   chimney rhythms. Era 6 retains two full domes with lanterns and one City Hall
   cupola/chimney crown.
2. **Open-versus-enclosed rule.** `POL.1`, `POL.2`, `POL.8`, `town-hall`,
   `classical_public_granary`, `classical_baths`, and `classical_fountain` each show a
   continuous functional open-to-sky region covering at least one-third of the plan.
   No more than three Era 6 plots may meet that same threshold.
3. **Roof-geometry rule.** Era 4 contains zero broad hipped roofs and zero single roof
   caps spanning an entire 2×2 or 3×2 plot. Every Era 4 roof matches its exact section
   5 treatment.
4. **Structural-system rule.** Every exposed Era 4 support row is a straight
   entablature on freestanding columns. Every visible Era 4 arch is a deep vault,
   apse, niche, or aqueduct element. A shallow arcaded screen fails.
5. **Street-wall rule.** Era 4 contains zero uninterrupted regular three-storey
   façades. The one tall dwelling is visibly notched and unequal. Era 6 visibly
   retains at least three regular multi-storey wall-first blocks.
6. **Blind-sort rule.** Both reviewers achieve 21/21 in both contact sheets as defined
   in section 8.1.

### 8.3 Per-building report

The review report is a numbered ten-item checklist in section 5 order. Each item must
name its evidence type before the verdict and report:

1. silhouette and plan;
2. roof treatment;
3. structural system;
4. required thumbnail detail;
5. every regression ban;
6. colour-sheet classification;
7. grayscale-sheet classification.

Each field is `PASS`, `FAIL`, or **`NOT DONE`**. A paragraph claiming the set generally
looks ancient does not discharge a missing item.

The aggregate six-rule report follows the per-building report and uses the same three
verdicts. Anything skipped is explicitly **`NOT DONE`** and prevents a completion
claim unless section 8.4 makes it a future-only gate.

### 8.4 Runtime city frame

Era 4 and Era 6 per-node runtime GLBs do not currently exist, so runtime spatial
verification is outside this implementation unit until those assets are wired.

When runtime art exists, capture at least one **uncropped 1024×580** frame from the
actual cumulative Era 6 city at the locked gameplay camera, with Era 4 and Era 6
buildings standing together. The frame must show the island and surrounding city
context; a crop around the redesigned building does not prove skyline rhythm,
open-space visibility, or occlusion.

Until that frame can be taken, report:

> **Runtime 1024×580 city-frame verification: NOT DONE — Era 4 and Era 6 per-node
> runtime art is not wired.**

This future-only item does not block acceptance of the concept-art unit, but nobody
may cite the concept contact sheets as proof of runtime spatial separation.

---

## 9. Rollout order

Implementation proceeds in this order:

1. Record the ten current canonical Era 4 image hashes and preserve the current
   contact sheet as the baseline.
2. Reconcile the Era 4 style guide with sections 2 through 6, changing visual prose
   only and preserving every frozen contract.
3. Reconcile the Era 4 civic guide with the four civic entries in section 5.
4. Rewrite the image-generation README from the reconciled era guides.
5. Rewrite all ten JSONL prompts from the README.
6. Run the bidirectional prompt census and a literal scan for all hard regression
   bans before generating an image.
7. Generate all ten candidates into one temporary run folder. Do not overwrite a
   canonical PNG yet.
8. Verify ten files, ten expected names, 1024×1024 dimensions, and nonzero hashes.
9. Build the randomized colour and grayscale contact sheets.
10. Run both independent reviews and the six aggregate rules.
11. Correct failed prompts and regenerate candidates under the redo rules in
    section 10.
12. Only after the whole set passes, install all ten canonical PNGs as one set.
13. Rebuild the two contact sheets from the installed canonical files and repeat the
    two-reviewer classification. Candidate-sheet results do not certify installation.
14. Report every item and aggregate rule, including the required runtime
    **NOT DONE** entry.

No partial set is installed for convenience, and no passing candidate is called
shipped while its canonical path still contains the old image.

---

## 10. Rollback and redo criteria

### 10.1 Redo one or two failed buildings

If one or two Era 4 images fail while the other eight satisfy every per-building rule:

1. Keep the passing candidates in the temporary run folder.
2. Revise only the failed prompt clauses, naming the observed failure and its legal
   alternative.
3. Generate a new temporary candidate for each failure.
4. Rebuild both full 21-image contact sheets.
5. Repeat both reviewers' entire classifications; a prior pass does not transfer to a
   changed sheet.

### 10.2 Redo the common grammar

If any of these occurs, the common prompt grammar has failed and all ten Era 4
candidates are regenerated after revising the shared brief:

- three or more Era 4 images are misclassified by either reviewer;
- any Era 4 image gains a broad hip, exterior dome, Renaissance palazzo façade, or
  shallow arcade screen from a shared prompt clause;
- the open-versus-enclosed, skyline, roof-geometry, or structural-system aggregate
  rule fails;
- colour passes but grayscale fails for more than one image.

### 10.3 Stop rather than iterate blindly

If one building fails the same binary rule after two prompt revisions and two
replacement generations, stop image generation and return to this design record.
There is no third blind rerender. The design or the prompt architecture must be
reviewed before more generation cost is spent.

### 10.4 Contract violation

Stop immediately if satisfying the art appears to require changing an ID, display
name, mass, role, footprint, price, contribution, relative height position, or runtime
contain-fit rule. Those are non-goals, not implementation options.

### 10.5 Rollback after canonical installation

If the installed set fails the post-install contact sheets, filename census, hash
check, or duplicate scan:

1. Restore all ten prior canonical Era 4 PNGs together.
2. Remove every noncanonical duplicate from the canonical folder.
3. Keep failed candidates only in the temporary evidence folder.
4. Correct and re-review the set before attempting another atomic installation.

Never roll back one installed image and leave a mixed old/new canonical set.

---

## 11. Unresolved questions

**None.** The era direction, moved era, ten architectural archetypes, frozen
contracts, canonical outputs, acceptance thresholds, rollout order, and redo policy
are decided. Any later request to change one of them is a new design decision, not an
implementation detail.

---

## 12. Spec self-review

- **Placeholder scan:** passed. The document contains no unfinished fields or deferred
  design choices.
- **Internal consistency:** passed. The void-first aggregate rules agree with every
  per-building plan, roof, and structural system.
- **Frozen-contract check:** passed. All ten footprints, roles or masses, IDs, names,
  and the complete relative height order remain unchanged.
- **Binary-criteria check:** passed. Thumbnail size, sheet population, shuffle seed,
  reviewer count, required score, open-area threshold, skyline exclusions, roof
  exclusions, and redo thresholds are explicit.
- **Scope check:** passed. The work is one Era 4 documentation/prompt/concept-art
  implementation plan; Era 6 redesign and runtime wiring are excluded.
- **Census:** passed. Section 5 contains exactly ten unique canonical entries: five
  skill IDs, one hub ID, and four civic IDs, each appearing once as a redesign entry.
- **Ambiguity check:** passed. The approved direction is not reopened and section 11
  contains no unresolved choice.

**NO IMPLEMENTATION IS PERFORMED BY THIS DOCUMENT.**
