# Held ground, per tile, and not under a building

Two rulings from one QA pass:

> *"everything looks good on the first era crisis except the tiles that are protected by fire;
> instead of making all the tiles overlap, just make the tiles protected by the real fire look like
> it does in the preview, with each tile individually protected as shown in image"*

> *"also the fire-protected squares that overlap with buildings look terrible; just make the fire
> not show when it overlaps with the building"*

Every frame is **1024x580 under reduced motion**, taken through the shipped island renderer by
`apps/web/src/city/three/winterHeldGroundShots.browser.test.tsx`
(`VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts`). The `before-*` set was
taken by the same suite at `146ecbe7` with the two changes reverted and nothing else altered — same
city, same fire, same camera.

| frame | what it is |
| --- | --- |
| `01-preview-widest-reach` | the fire PROPOSED at `(0, 0)`, all three tier bands ghosted |
| `02-committed-reach-0` | a lit fire holding its own cell. One cell |
| `03-committed-reach-1` | the cross. Five cells |
| `04-committed-reach-2` | the diamond. Thirteen cells, and the frame the claims rest on |
| `measured-captions-1024x580.txt` | what every building's caption actually reads on screen in `04` |

`01` against `04` is the pair *"they now match"* rests on: same cell, same city, same camera,
proposed and committed.

## The board is built so one frame carries every case that was asked about

A fire at `(0, 0)` with a compact settlement round it:

- **inside the held area** — `NUM.3`, a 1x1 at `(0, 1)` with held ground on all four sides;
- **a multi-cell footprint fully inside** — `NUM.F`, a 2x1 at `(-2, 0)`, both cells held;
- **at the edge of the reach** — `NUM.5`, a 2x2 at `(1, 1)` with exactly one of its four cells in
  reach. This is the *"partial tan patch under one corner"* case;
- **the hub straddling the boundary** — a 3x2 at `(-2, -2)`, three of its six cells held;
- **three buildings the fire does not reach**, so the treatment has something to be read against.

The always-on half of the shot suite derives all four cases off the engine's board, so the captions
above cannot be wrong about what the pictures show.

## What the frames show

**Which module produced which look.** Neither, in the end. The preview and the committed fire went
through the same spec (`WARDED_TERRAIN`) and the same builder (`buildCellTerrain`) and diverged on
one argument — the cell set each handed it as `exposed`, since a feather is only cut where the state
ends. The preview was built band by band, and no two cells of a band are orthogonal neighbours, so
every previewed cell was rimmed all round. The committed fire was built against the whole warded
region, so its interior cells kept their rim where the neighbour would compute it and merged.

**`before-04` against `04`.** Before: one merged irregular tan region with no internal boundary,
running under and around every building it touches. After: six separately rimmed tiles with snow
between them, and no tan under any building. The tile shapes in `04` are the same shapes as in `01`,
because they are the same vertex buffers — `winterHeldGroundPerTile.test.ts` asserts that per cell
rather than leaving it to the eye.

**`02` and `03`, the small reaches.** At reach 0 the single held cell reads as one tan diamond
around the hearth stones. At reach 1 the cross reads as five, each with its own rim. Neither could
ever have merged, which is why the wide reach is the frame the claim rests on.

## Honest read: what per tile costs

**The boundary between held and unheld ground is still legible** — more so, because there are now as
many rims as cells and each keeps at least three quarters of its plan (asserted, not eyeballed).

**It still reads as one fire's doing**, and the hearth is what carries that: the tiles cluster round
it and the flame sits in the middle of them. But the tan no longer forms a single shape, so **"how
much ground is this fire holding" is harder to count on a densely built board than it was.** On the
board photographed here the widest reach holds 13 cells and 7 of them are under a building, so 6
tiles are drawn. The region reads cleanly rather than as holes — the omitted cells are filled by
buildings, so the eye sees building and not gap, and the tan appears in the yards between them,
which is what cleared ground looks like — but the fire's diamond is no longer readable as a diamond.
That is the trade, and it is the lead's to reverse.

## The caption the ground is standing in for, measured

Removing the tan is only safe because #502 made a building's floating caption its crisis status. A
caption is not automatically on screen — `resolveVisibleLabels` drops any label whose padded box
hits a nearer one — so it is read off the live overlay of `04` rather than argued:

```
NUM.3      footprint=1x1 heldCells=1 caption="SAFE" opacity=1.00 at=800,249
NUM.F      footprint=2x1 heldCells=2 caption="SAFE" opacity=1.00 at=718,265
NUM.5      footprint=2x2 heldCells=1 caption="SAFE" opacity=1.00 at=873,149
NUM.S      footprint=2x2 heldCells=0 caption="SAFE" opacity=1.00 at=709,345
NUM.2      footprint=2x2 heldCells=0 caption="SAFE" opacity=0.00 at=836,131
NUM.4      footprint=1x2 heldCells=0 caption="SAFE" opacity=1.00 at=732,118
town-hall  footprint=3x2 heldCells=3 caption="SAFE" opacity=1.00 at=675,147
```

**Every building standing on held ground reads SAFE at full opacity.** That is the claim, and it is
asserted in the suite so a board that broke it would fail rather than ship.

## ⚑ Two residuals, reported rather than closed

**1. A caption can be culled by collision.** `NUM.2` above is on the page at **opacity 0.00** — its
box collided with a nearer label and the overlay dropped it for that frame. On this board it landed
on a building the fire does not reach, so nothing was taken from under it. But the mechanism is
general: on a denser board a building on held ground could lose its caption for a frame, and it
would then have lost both channels at once. The assertion above catches it on this board only.

**2. A bought CIVIC building gets no caption at all.** `skillLabelTargets` captions what the skill
graph knows, plus the hub during a crisis, and a civic placement id is deliberately in neither —
while `CitySurface`'s `scenePlaced` does draw civic buildings on the island. That hole is **not
widened here**: `liveCityLayoutFrom` builds the winter board from `placements` and `town_hall` only,
so a civic building is not on the board and cannot be warded, threatened, shielded or ruined. The
tan under one was a fact about the cell and never about the building. `winterHeldGroundPerTile.test.ts`
asserts both halves in both directions, so the day a civic building joins the board without gaining
a caption, it fails there.
