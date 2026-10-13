# The frost's opening ring, one full layer further out

The lead, having played it: *"the initial ring is still too close bro; it needs to start one layer
out. please actually make sure that gets implemented and its not just something you say is
implemented but isnt actually - weve gone over this countless times."*

Every frame here is **1024x580 under reduced motion**, taken through the shipped island renderer by
`apps/web/src/city/three/frostFront.browser.test.tsx` (`VITE_WINTER_SHOTS=1 npm run test:browser`).
The before and after pair is the **same board, the same placements and the same camera** — nothing
about the framing moved, so the only difference in the picture is where the front stands.

| frame | what it is |
| --- | --- |
| `01-before-round-one-on-load` | round one on load, canvas only, **before** |
| `02-before-composite-round-one-on-load` | the same instant as the player sees it, panel and all, **before** |
| `03-after-round-one-on-load` | round one on load, canvas only, **after** |
| `04-after-composite-round-one-on-load` | the same instant with the panel, **after** |
| `05-before-mid-encounter` / `06-after-mid-encounter` | one round played, so the change can be read at a two-step round as well as at the opening |

`island-*` frames hide the crisis mount before the capture, because a CDP screenshot taken with a
DOM layer over a WebGL canvas returns a stale canvas frame — `winterIslandVisible.browser.test.tsx`
measured that, and the composites are here so the picture the player actually gets is on the record
too.

## What the frames show

**Before (`01`).** The ice ring runs *through* the settlement's outermost ring of buildable ground.
It passes at the foot of the roundhouse under *Signed numbers* on the left and at the foot of
*Fractions* on the right, with no clear ground between the shove ice and either building. Outside
the ring there is a wide pale field of frost margin and then the beach — more island beyond the ring
than inside it, which is the picture the objection is about.

**After (`03`).** The ring stands on the ice outside the board. There is a clear band of settlement
ground, one cell wide, between the ring and every building; the roundhouse and *Fractions* both sit
well inside it, and the rime still points inward so the direction reads unchanged. A band of frost
margin is still visible outside the ring, running to the coast lip and the sea ice, so the frost is
still continuous with the frozen lagoon.

**Mid-encounter (`05` against `06`).** The band keeps its width and slides out with the opening
ring: at round two the wall stands on the board's own edge rather than one ring inside it, with two
rings of rime reaching in. What the slide costs is the rime on the deepest ring of the advance, and
that is visible in the pair.

> **⚑ THE WIDTH IN THAT LAST PARAGRAPH IS THE DOUBLE ICE RING, AND IT WAS RULED OFF ON 2026-08-04.**
> *"with two rings of rime reaching in"* is exactly what the lead has now objected to for the fifth
> time — *"there shouldnt be two concentric rings once the frost moves"*. The band is one ring at
> every round now, so `06` is no longer the shipped mid-encounter picture. It is kept because the
> claim these frames were taken for — WHICH ring the front stands on — is unchanged and is still
> read off them. `docs/design-refs/hard-winter-one-ice-ring/` holds the current three-round set and
> the before/after pair for the width.

## Measured, on the board in these frames

The distance is in orthogonal cell steps from the nearest front mark to each building's cell.

| building | rim depth | before | after |
| --- | --- | --- | --- |
| `NUM.2` (the outermost) | 0 | **0** — the front stood on its cell | **1** |
| `NUM.S` | 1 | 1 | 2 |
| `NUM.F` | 1 | 1 | 2 |
| `NUM.4` | 1 | 1 | 2 |
| `NUM.3` | 2 | 2 | 3 |
| `NUM.5` | 4 | 4 | 5 |

Every building gains exactly one cell, which is the ask. The front's own geometry moves from world
radius 16.8–23.5 to 20.9–27.0, and the population moves from the 28 cells of the shoreline band to
the 32 off-board cells of the ring outside it.

The photographed city is `frostFront.browser.test.tsx`'s spread fixture rather than the shipped
`defaultPlacements`, and that is the harsher case on purpose: `defaultPlacements` packs buildings
nearest-the-centre-first, so on a board nobody has rearranged every building is at rim depth 2 or
deeper and none of them ever had the front standing on it.

## What did not move

The engine. `WinterCellView.frost_next` is still the whole 28-cell shoreline band at round one, the
spread schedule is still 1 / 2 / 3 over three rounds, and the cumulative advance still takes 28 then
72 then all 88 cells — so the frost still reaches the heart of the settlement as the **last** round
closes, which is what the three-round tuning was shaped around.
`apps/web/src/city/three/frostFrontRing.test.ts` asserts both halves, separately and in CI.
