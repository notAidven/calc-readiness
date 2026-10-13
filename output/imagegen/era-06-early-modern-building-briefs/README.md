# Era 06 — Early Modern building briefs

**Display name:** Early Modern
**Stable runtime id:** `renaissance` (unchanged; no migration)
**Status:** eleven refined concepts recolored to the Northern Early Modern palette on 2026-08-03.

This folder is the canonical authoring set for Era 6. The images are direct
Three.js modelling references. Their current composition, building identity,
physical corrections and medium-rich architectural detail are locked. Build the
silhouette first, then preserve the trim and material breaks that survive at 128 px.

## Shared production contract

- Stylized low-poly isometric city-builder concept, 1024×1024, one discrete
  plot, flat lighting, no text and no crowds.
- Keep the primary masses reproducible with boxes, extruded polygons, cylinders
  and roof prisms. Repeated trim may use shared or instanced geometry.
- Preserve the accepted camera, proportions, openings, props and medium-rich
  physical detail. Recoloring is not permission to simplify or redesign.
- Ordinary buildings use 4–10 large simple windows. City Hall may use 10–14.
- Ordinary buildings use at most 2 chimneys. City Hall may use at most 3.
- Use at most 3 large function props. A prop must read at the city camera.
- Carry the era through large geometry: enclosed masonry blocks, dark
  slate/lead roof prisms, and at most one stepped or curved gable, dormer pair,
  oriel, cupola, dome or tower where the building calls for it.
- Dominant wall fields are warm buff lime plaster `#C7A48E`.
- Hand-made muted red-brown brick `#B1775A` is localized to gable edges,
  chimneys, bases or selected secondary façade areas. It never takes over a wall
  field and never carries Era 7 soot.
- Pale dressed stone `#D8CDB3` frames doors, windows, structural corners and
  plinths.
- Every roof and named metal cap is dark cool blue-gray slate or sheet lead
  `#596675`. Ground is pale and neutral. No terracotta roofs.
- No dominant pink, rose or magenta wall field.
- Do not borrow Era 4's open Roman campus/stoas, Era 5's exposed half-timber or
  jetties, or Era 7's iron, soot and factory geometry.

## Canonical census

1. `geo-1-observatory.png` — `GEO.1`, 2×2. One square tower, one lead dome,
   one lantern, five large windows and one oversized telescope.
2. `pol-7-lecture-theatre.png` — `POL.7`, 2×2. One faceted curved hall, one
   dark roof and one small cupola; exterior mass alone implies the tiering.
3. `geo-2-drawing-office.png` — `GEO.2`, 2×1. One long two-storey block, one
   roof prism, eight tall north-light windows and two dormers.
4. `pol-6-printing-house.png` — `POL.6`, 2×2. One urban block, one stepped
   gable, one loading door, two chimneys and one large press.
5. `cg-1-mapmakers-house.png` — `CG.1`, 2×2. One townhouse, one simple oriel,
   one low-walled rear court and one oversized survey instrument.
6. `rat-5-cannon-tower.png` — `RAT.5`, 2×2. One broad battered cylinder,
   exactly three embrasures and one ramp; no ammunition clutter.
7. `townhall-early-modern-city-hall.png` — Town Hall, 3×2. One dominant civic
   block, two end gables, one central lead cupola, two chimneys and fourteen
   large wall windows.
8. `civic-covered-market.png` — food, 2×2. One high-roof hall, two stepped end
   gables, six broad bays and three large stall blocks.
9. `civic-merchant-houses.png` — livability + happiness, 2×2. Exactly three
   connected narrow houses with three distinct simple gables, six windows and
   three ground shop openings.
10. `civic-town-square.png` — happiness, 3×2. One open square bounded by
    exactly two simplified gabled façade blocks and one central fountain.
11. `civic-painters-school.png` — blend, 1×2. One studio block, one stepped
    gable, four large north windows, two rooflights and one easel.

The first generation pass was accepted for ten images. The Merchant Houses
received one second pass so its three gables were visibly distinct while
remaining exactly three connected masses. On 2026-08-03 all eleven refined
images were used as strict image-to-image references for the Northern palette
recolor; every result passed full-size and 128 px review on the first recolor
pass, with no architecture or detail redo.

## Prompt source

`era06-early-modern-concepts.jsonl` is the rerender source. Each line is a
standalone prompt and repeats the production contract intentionally, so a
single-building rerender cannot silently recover the superseded ornate brief.

## Related

- `docs/superpowers/specs/eras/era-06-early-modern/style-guide.md`
- `docs/superpowers/specs/eras/era-06-early-modern/civic-buildings.md`
- `docs/superpowers/specs/eras/README.md`
