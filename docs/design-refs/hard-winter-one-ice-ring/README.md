# One ring of ice, at every round

The lead, for at least the fifth time: *"the double ice ring in the winter crisis is still there. it
should always just be one ring bro like for the 50th time there shouldnt be two concentric rings
once the frost moves"*.

Every frame here is **1024x580 under reduced motion**, taken through the shipped island renderer by
`apps/web/src/city/three/winterOneIceRing.browser.test.tsx`
(`VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts`). The `before-*` set was
taken by the same suite at `cee31658` with the fix reverted and nothing else changed — same city,
same camera, same rounds played the same way through the panel — so the only difference in any pair
is how wide the front's band is.

`island-*` frames hide the crisis mount before the capture, because a CDP screenshot taken with a
DOM layer over a WebGL canvas returns a stale canvas frame; the ring is judged on those. The
`composite-*` frames are the same instant as the player has it, panel and all.

| frame | what it is |
| --- | --- |
| `01-round-1-of-3` | round one on load. One step of frost coming |
| `02-round-2-of-3` | one round played. Two steps coming |
| `03-round-3-of-3` | two rounds played. Three steps coming, and 72 of 88 cells already frozen |

## Why the sequence, and not one frame

*"Once the frost moves"* is the whole of the report. Round one has always drawn one ring, so a frame
of it says nothing about the defect — and a round-one frame plus an uncounted mid-encounter frame is
what the two previous fixes in this area were judged on.

## What the frames show

**Round one (`01`), before and after: the same picture, to the pixel.** Measured rather than
described — `0` of 593,920 pixels differ between `before-island-01` and `island-01`. One ring, on
the ice outside the board, as it has been since the ring slid a layer out.

**Round two (`02`).** Before: the walled ring on the board's own edge, **and a second rank of blue
spikes a full cell inside it**, running right round the settlement over clear pale ground. It
carries no shove ice at all — 24 cells of free-standing rime — which is why it reads as a second
ring rather than as a thicker front. After: the ring, and clear ground inside it. 7,506 pixels
differ, all of them inside the island.

**Round three (`03`).** Before: the ring drawn tight around the hall, with a second rank of long
spikes reaching across the plaza toward it. After: just the ring, its own rime hugging the wall.
3,521 pixels differ.

## What was actually wrong

Not a leak, and not a layer left uncleared. `frostFrontMarks` marked the stand ring **and every
layer of the coming advance except its deepest**, so the front's band was as many cell rings wide as
the round had steps — and era one's schedule is 1 / 2 / 3. Measured at `cee31658`, off the built
geometry:

| round | marked cells, by rim depth | wall plates | rime shards |
| --- | --- | --- | --- |
| 1 | −1: 32 | −1: 144 | −1: 96 |
| 2 | 0: 28, **1: 24** | 0: 120, **1: 0** | 0: 84, **1: 72** |
| 3 | 2: 16, **3: 12** | 2: 72, **3: 0** | 2: 48, **3: 36** |

## What it cost

The band width was the one channel saying *how deep is this round* on the ground, and
`FROST_FRONT_REACH_NAME`'s own note claimed it. That reading is given up here. It is not lost from
the product: the crisis panel states the round's advance in words, and the frost's own extent — the
sheet, the line and its crest — grows by exactly those rings when the round closes, whether or not
the front was drawn over them a beat early.

## The always-on half

`apps/web/src/city/three/frostFrontOneRing.test.ts` counts the concentric rings of standing ice on
every round of a played winter and fails on more than one. Its population is every standing-ice mesh
the layer builds, not the front's own two names, so a second ring drawn by some other module is a
failure there rather than a sixth report. Three defects were injected into the shipped tree to prove
it fires: the old band width (fails at *"round 2 draws ice on 2 concentric rings (rim depths 0,
1)"*), a ring with its wall stripped (*"round 1's ring stands no shove ice"*), and a stray ice mesh
standing on the island (*"round 1 stands lagoon ice on the island, which would read as a ring"*).
