# Era six's Plague, on the island — ten frames at 1024x580

Every frame here is **1024x580**, uncropped, at the **shipped city camera** over **era six's own
island**: grass 46, the camera `46 * CAMERA_DISTANCE_RATIO = 105.8` out at `CITY_FOV` 32, tilt
locked at `VILLAGE_CAMERA.polarAngle` 0.72 rad (49° of elevation), lit by `PLAGUE_LIGHT` resolved
to the four real lights — key 0.52 at `shadowIntensity` **0.28**, hemisphere 1.02, ambient 0.54,
fog at the shipped fair-weather planes.

**One world unit is 19.1 screen pixels at the closest dolly, 9.6 at rest and 3.7 at the widest
zoom a player has.** That number is the single most important fact about this batch and it is why
the anchor had to be corrected: era four's forum, where the sheet's anchor object lives, is 28.7
pixels per unit.

Taken by `apps/web/src/city/three/plagueIslandShots.browser.test.tsx`, which is off by default:

```bash
VITE_PLAGUE_ISLAND_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/plagueIslandShots.browser.test.tsx
```

## The board

Five civic buildings on the 4-unit placement grid, inside era six's buildable disc of 38, placed
the way a learner might — **not a ring, not a star, and not a layout that puts joined buildings
near each other**. Two roads run under the bands. The masses are the shipped neutral built
template rather than era six's GLBs, which do not exist: `resolveBuildingModel` fails closed to it
for any unmapped id, at the civic footprint from the catalogue. **That is a stand-in for the
fabric and it is not a stand-in for the plot, the grid, the camera, the light or the ground**,
which are the five things every claim here is about.

Two consequences of the stand-in are visible and are neither a defect nor a decision of this
batch: the template's roof is `#9C6F4E` where era six's roofs are lead `#596675`, and it has a
door where era six's four civic types have none.

| # | Frame | What it is evidence for |
| --- | --- | --- |
| 01 | `the-board-in-play` | Every asset at once at the resting camera: five bands with two carrying, a route shut under a two-course stone, a marked building and a shut one |
| 02 | `band-three-states` | Open, carrying and suspended, on three parallel bands over the same ground. **A comparison plate** — see below |
| 03 | `duration-ladder` | A spent stone, one course, two, and a full collar, on four parallel bands. **A comparison plate.** The collar is the rung `plates/` failed to deliver, so this is the only picture of it |
| 04 | `marked-against-clean` | A building carrying the threshold mark beside one that is not |
| 05 | `shut-and-affected` | The two facts in two places: the mark on the floor in front, the boards on the fabric |
| 06 | `proposal-and-the-set` | The see-through stone in its committed place, the band it would cut outlined along its length, and the ring round the set it would separate. **Nothing in `plates/` shows this asset at all** |
| 07 | `long-link-not-adjacency` | Plate 06's own picture: a long band from the market to the school, passing under the square's plot and out the other side, with two buildings visibly not on it |
| 08 | `the-widest-zoom` | Where it stops reading. At 2.6x the stone is under four pixels and the ladder is gone; the bands are still there |
| 09 | `a-day-nobody-went-out-in` | The surveyor's plane table on its tripod with the ranging rods where they were set — the one prop asset 6 needs that the island does not already author |

`measured-1024x580.txt` holds the duration ladder's four readings off frame 03.

## Two of them are comparison plates and they say so

Frames 02 and 03 put their subjects on parallel bands over clear ground at the same heading,
which is not a board in play. **The reason is measured rather than stylistic.** The same four
duration rungs photographed where a real board puts them — four bands at four headings over four
slightly different patches of ground — came back with the middle pair inverted by 0.009 and the
ends separated by nothing at all, because a module of the ladder is about two pixels and that is
inside what a background does to a 7x7 box. A claim about a difference needs the other variables
held. The board in play is frame 01.

## What the frames settle, and what they do not

**They settle that the band reads and that its three states separate.** On the island as it ships
the band's BODY does not carry it: era six's own geometric paving is unauthored
(`ERA_ISLAND_GROUND` carries era one only), so the floor is `UNAUTHORED_TERRAIN`'s `#9A9184` at
weighted luminance 0.573 against `INLAY`'s 0.596 — 0.023 apart, and the wrong way round. What
carries it is the pair of joints, `INLAY_NOTCH` at 0.393, which is 0.180 below the ground. That is
what the two-plate construction buys and it is why the band was never one plate.

**They settle that the count on the stone needed to move.** The sheet puts the whole duration
ladder on the stone's sides. Photographed, it was not countable at any dolly: the tilt is locked
at 49°, so a 0.598 block presents its top face and about a third as much side. The count is cut
across the TOP face as well now, in era four's shipped two-plate construction, and frame 03 is
where one course against two can be told apart.

**They do not settle the count on a real board.** See `measured-1024x580.txt`: shut reads
anywhere, set-against-spent reads anywhere, and for-how-long reads when a player has two stones to
compare and not otherwise.
