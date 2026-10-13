# Era one's crisis, read at the zoom people play at, at 1024x580

Two rulings of 2026-08-02, both the same problem: a mechanic whose state cannot be read at the zoom
people actually play at. These are the frames.

**Regenerate with:**

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/winterCrisisLegibility.browser.test.tsx
```

## The viewport and the camera, because both are half the evidence

Every frame is **1024x580**, the lead's own short laptop window, named in every filename. The camera
is the game's own — `VILLAGE_CAMERA.polarAngle`, 49 degrees of elevation, at `CityScene`'s fov 32,
framed by `winterFraming` because a crisis panel is on the island — and it is driven with
`applyCameraAction`, the player's own zoom and arrow buttons. **Every frame's dolly is asserted after
`CityScene`'s clamp has had a frame to pull it back**, so no frame here is taken from a distance the
game forbids. A previous pass demonstrated the fuel ladder at `cameraDistance * 0.22`, 2.3x nearer
than `VILLAGE_CAMERA.minDistanceRatio` allows.

Everything is under `reducedMotion`: the island's gulls alone produce up to 0.88% whole-frame noise
between two frames of an unchanged board, and a guard here has already been found hollow because of
it.

## The four views

`CityScene` clamps the dolly between `minDistanceRatio` (0.5x) and `maxDistanceRatio` (2.6x), so
three views exist, plus the one the smoke column was actually designed for.

| view | what it is |
| --- | --- |
| `resting` | 1.0x, the dolly a winter opens at. **The view the rulings are about.** |
| `closest` | 0.5x, as near as the game lets a player get. |
| `across-the-island` | 1.0x with the fire out on the shore at `(-5, 0)` and the settlement in the middle of the frame. This is `winterFire.ts`'s own findability case: *"from the far rim of the island it has to be findable over whatever is standing in between."* |
| `far` | 2.6x, as far out as the game lets a player get. |

## Ruling 2: can you tell three rounds left from one?

Changed pixels between two frames of the same board with only `rounds_left` moving, measured over
the island strip the crisis panel leaves free. The committed `measured-smoke-*.txt` files are the
raw output; the `3-against-1` images are the two frames side by side at full resolution.

| view | 3 -> 2 | 2 -> 1 | 3 -> 1 | can you tell them apart |
| --- | --- | --- | --- | --- |
| `resting` 1.0x | 16,489 | 6,552 | 18,393 | **yes, unmistakably** |
| `closest` 0.5x | 11,500 | 10,091 | 14,318 | **yes** |
| `across-the-island` 1.0x | 19,926 | 8,090 | 22,095 | **yes** |
| `far` 2.6x | 345 | 445 | 453 | **no** |

Re-measured on the recovery branch, where `MAX_RISE_RATIO` is #465's 0.42 rather than 0.62 and
`RAFTER_SPACING` its 3.2 rather than 2.3 — three of the buildings in shot wear a storm roof, so every
frame here had to be re-taken. Every row lands within a percent or two of the first pass, which is
the point: a shorter gable did not change what a rung of the fuel ladder is worth.

**THESE ADJACENT-RUNG COUNTS ARE NOISE-SENSITIVE, AND THAT IS THIS FILE'S OWN FINDING RATHER THAN A
CLAIM ABOUT ANY BRANCH.** Some mounts of an identical board render a fine speckle across the whole
island — not the gulls, which `reducedMotion` seats, and not isolated pixels either, since requiring
two changed neighbours leaves the box unchanged at 539x552. Measured over four consecutive runs of
`across-the-island` on one checkout, `3 -> 2` came back 13,336 / 13,337 / 19,887 / 19,926 and the
change box swung between 90x367 and 540x554. It is worth about 6,000 pixels when it lands, which is
under a third of the smallest signal in the table above, so no row's verdict turns on it — but the
sweep's *"the ends of the ladder are no further apart than one of its rungs"* assertion compares raw
counts, and it fails when the speckle lands on an adjacent pair and not on the whole one. Those
assertions are `runIf(SHOTS)` and do not run in CI, so this cannot redden trunk. It is recorded here
rather than tuned away because the instrument is #449's and its unit is what makes the table
comparable with the pass the lead rejected.

The unit is #449's own, so the numbers are comparable with the ones that were rejected: the flame's
whole three-rung ladder moved **about 340 changed pixels in a 25x30 box** at the resting camera,
which is what *"an 11px descent on a 21px-wide flame"* comes to. At the resting camera the column
moves **18,074**, which is 53 times that, and the three rungs are three obviously different
pictures: at three rounds the column leaves the top of the frame, at two it tops out about 95px
down, and at one it is a stub just above the rooflines.

**At full zoom-out it does not read, and that is a finding rather than something to work around.**
The island is about 300px across, the column is a few hundred pixels of low-contrast pale smoke
against a pale overcast sky with the crisis fog over it, and read side by side in
`smoke-far-3-against-1-1024x580.png` the two frames cannot be told apart by eye. Nothing about the
column's tone or opacity was changed to chase it: that ramp is #449's, and it is what keeps a dying
fire's wisp from reading as a living fire's plume. The `across-the-island` row is the stronger
reading of "the far view" and the one the column was built for, and it passes.

## Ruling 1: `SHIELDED` over a reinforced building

**REWRITTEN 2026-08-04.** `tag-*.png` photographed #470's second DOM overlay above the roofline, and
that overlay was retired at the forward merge of #502: the lead's 2026-08-03 QA made the WHOLE label
the building's status, so two things were saying SHIELDED over one building. `shielded-*.png` is the
same three views of the same board, with `[data-label-status="shielded"]` as the subject the tag used
to be.

They are the whole viewport with the crisis panel on it, because a claim about a caption being
readable over a building is a claim about the SURFACE: cropped to the caption, a screenshot proves
nothing, since the caption is the one part of the picture nobody doubted.

Three buildings are reinforced and **one of them is the hub**, which is the subject #449 found had
never been photographed at all, because every overlay population in the tree derives from the skill
graph and the graph correctly excludes the hall. The caption's population is the BOARD's now, so the
hub is captioned like anything else — 7 of 7 buildings carry a status in these frames.

| view | SHIELDED legible | note |
| --- | --- | --- |
| `resting` 1.0x | 3 of 3 | all three read, the hub's at (687, 132) included, and no caption overlaps another |
| `closest` 0.5x | 2 of 3 | the hub's caption lands at **y = -38** and is cut off by the top of the canvas |
| `far` 2.6x | 0 of 3 | every caption has faded to nothing by `LABEL_FADE_END_RATIO` (1.9x) |

`measured-shielded-*.txt` carries every caption's box, state and opacity, so which case each one is
can be read rather than guessed.

### The two things the caption does not do that the tag did

Both were found by RUNNING the ported frames rather than by reading the diff, and both are what
retiring #470's overlay cost. `CAPTION_AT` in the test pins each of them per dolly and in both
directions, so a change that restores either behaviour fails rather than passing quietly.

**No zoom-out reading.** The tag deliberately had no fade — *"pulled back over the whole island is
exactly when 'which of these did I reinforce' is the question"* — and a caption is faded to nothing
by 1.9x, so at the 2.6x clamp nothing says SHIELDED in words. The reading is not lost, it changes
channel: `CrisisStatusMarker`'s chevron is in-scene geometry and does not fade, which is the argument
now recorded in that file's header. What is lost is the WORD.

**No clamp, so a caption can leave the frame.** The tag's `placeTag` clamped inside the canvas and
flipped below its anchor when there was no room above, because #470 measured the hub's tag landing
51px above this same 1024x580 viewport. `SkillLabels` has neither, on the reasoning that *"a caption
clipped at the frame edge is a caption you were about to lose to the zoom fade anyway"* — true of a
skill name, not true of a status. So at the `closest` dolly the hub's SHIELDED is at `y = -38` and
`overflow:hidden` cuts it. Porting the clamp into the caption layer is the fix, and it is more than a
merge should carry.

### What the tag's own frames had recorded, kept because it is still the reason for the layout

**The three shielded buildings are spread across the cluster, and that was a finding rather than a
convenience.** The first set photographed put the hub beside the tall Tower two cells away; measured
at 1024x580 their boxes landed at x=674 and x=762 against a box 120px wide, they overlapped, and the
collision pass correctly kept the nearer one. On a packed board two adjacent buildings are one
caption's worth of room.

**A tag was sitting on a NEIGHBOUR's skill label**, which was the half of *"the channel above a
roofline holds one thing legibly and two never"* that two overlays could not enforce between them:
each ran its own collision pass over its own boxes. Measured before the fix, at three collisions
across two dollies — `NUM.2`'s tag over `NUM.5`'s label 37x10px, the hub's over `NUM.5`'s 30x21px, and
at `far`, `NUM.4`'s over `NUM.3`'s 82x24px. #470 answered it with `resolveVisibleLabels`' `reserved`,
publishing the boxes one layer kept for the other to treat as taken. That parameter is gone with the
overlay, and the ruling is now enforced by there being ONE pass over every box in the channel — which
is what the `0 overlapping` line in `measured-shielded-resting.txt` measures.

## The files

| file | what it shows |
| --- | --- |
| `smoke-<view>-<n>-of-3-rounds-1024x580.png` | one rung of the fuel ladder, one frame per rung per view |
| `smoke-<view>-3-against-1-1024x580.png` | three rounds and one round side by side, same board, same camera |
| `tag-<view>-1024x580.png` | the `SHIELDED` tags on the island, with the panel and the settlement around them |
| `measured-*.txt` | what the sweep measured, written by the test rather than transcribed |
