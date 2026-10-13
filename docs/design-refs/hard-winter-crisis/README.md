# Era one's Hard Winter, photographed with the renderer that ships it

**Regenerate with:**

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/winterCrisisAtlas.browser.test.tsx
```

Seventeen frames, every one of them **1024x580**, the size named in each filename.

## Why this exists, and what it replaced

Four image-generation passes were commissioned to draw reference art for era one's crisis
mechanics, and the lead stopped them. The reason is the whole of this directory's brief:
**almost every one of those subjects already renders in the game.** `winterFire.ts`,
`winterFireGhost.ts`, `winterShield.ts`, `CrisisStatusMarker.tsx`, `frostStage.ts`,
`ruinStage.ts`, `ScarredGround.tsx`, `BuildingFrostCrust.tsx`, `winterFrostFront.ts` and
`WinterGround.tsx` are all shipped and all drawn every time a winter runs. A generator's
impression of them was the wrong instrument for a question about what is on screen.

The prompt sheets those passes were built from are still at
`output/imagegen/era-01-hard-winter-fire-and-shield/README.md`, and its fifteen subjects are
what this set is measured against. **The numbering here is not that document's**, and three
frames it has no equivalent of are here: the real screen with the panel over it, the scar after
the thaw, and the five protection states photographed twice at two distances.

**Committed rather than left in `__screenshots__/`**, which is gitignored, following the
precedent `docs/design-refs/crisis-panel-width/` set and `docs/design-refs/advisor-wardrobe/`
followed: a shot nobody can open is not evidence in a review. **These are references and not
shipped assets** — nothing under `docs/design-refs/` is reachable from the app, the city
renderer loads no image texture at all, and that should stay true.

## The viewport is half the evidence, and it is 1024x580

`.cursor/rules/qa-verification.mdc`: a spatial claim owes a rendered frame somebody looked at,
taken at a short, realistic viewport and named beside it. Every frame here is the lead's own
short laptop window, and the size is in each filename rather than left to be inferred. The PNG's
own IHDR is read back in the run that wrote it, so a scaled capture cannot pass for the viewport
it claims.

**Nothing here is cropped to its subject.** Every frame is the whole viewport of the real island
— its snow, its lagoon, its fog, its sky and the neighbouring buildings — because a claim about
how a mark reads *against* the island is a claim about the surface, and a crop photographs the
one part of the picture nobody doubted. The close frames get closer only through
`applyCameraAction`, which is the game's own zoom button and arrow keys, so every frame is a
view a player can reach and `CityScene` clamps the dolly and the pan on the next frame whatever
the capture asks for.

## The subject that was exempt, and how the exemption ended

**The fire's duration (M14)** was the one thing here the renderer could not produce: the view
carried `rounds_left` and no mesh read it. This set shipped with that gap held as an assertion
rather than as a sentence — hold a fire fixed, move only `rounds_left`, require one picture back
— on the rule that an exemption which cannot stop being true is an exemption nobody revisits.

**It stopped being true within the day.**
#407 landed on `integration` while
this branch was open, the exemption went red on the merge with *"a mesh now reads the fire's
duration: the atlas owes its fuel frames"*, and those frames are the three `03-fire-burning-fuel-…`
rungs below. The claim is now the positive one: **one frame per rung of `FUEL_STEPS`**, which
`winterFire.ts` derives from `burn_rounds_by_tier`, asserted in both directions so a re-tune
that lengthens the top rung arrives here unphotographed and fails.

Nothing in this set is now unphotographable.

## The frames

Every board below is a real `HardWinterState`. Where the state says "played", every round went
through `declare`, `resolve` and `end_round`, so the frost's reach is the reducer's own advance
and each fire is the one the tuning grants for the score it was given.

| file | what it shows | the state that produced it |
| --- | --- | --- |
| `01-fire-proposed-…` | **The fire as a proposal (M13).** A ghosted hearth with a damped flame on the aimed cell, and the ghosted held ground it would take, banded by how certain each ring is. | One round played, then `hardWinterView` asked for a `fire_preview` on the cell beside the threatened building. Nothing declared. |
| `02-fire-declared-never-caught-…` | **A declaration that bought nothing (M11).** The hearth stands laid and fuelled, with no ember, no flame, no smoke and no held ground. | The same round, `fire` declared and the batch **missed** — the tuning's `none` rung gives a null radius. |
| `03-fire-burning-fuel-3-of-3-…` | **The fire working (M10, M12), and the top of its fuel ladder (M14).** Ochre held ground with a feathered rim, the hearth with its heat ramp, and the smoke column that carries the read at this camera. A fire that has just caught has its whole stack, so the burning state and the ladder's first rung are one photograph. | The same round, `fire` declared and the batch **aced** — the `strong` rung's radius, clipped to the island. |
| `03-fire-burning-fuel-2-of-3-…` | **The same fire later (M14).** | The same board with the lit fire's `rounds_left` moved and nothing else. |
| `03-fire-burning-fuel-1-of-3-…` | **The same fire at its last rung (M14).** | As above. The three are one frame set: see the note below. |
| `04-fire-burning-behind-the-panel-…` | **The real screen.** The same board with the crisis sidebar over it, so the frame answers how much island a player is actually left. | As `03`, captured with the overlay visible. **The sidebar is running its own untouched board** — see the caveat below. |
| `05-fire-burnt-out-…` | **A spent fire (M11): the same hearth, later.** Nine stones gone dark with one charred log, a thin wisp over them, and the ochre ground closed over by frost. | Played on from `03`'s round with the shortest catching rung until the engine's own reading of the fire is `spent`. The winter is still running. **This frame was re-taken on 2026-08-02 — see the note below.** |
| `06-ground-two-edges-…` | **The comparison the layer turns on (M9 against M12).** The frost's hard, grid-aligned cell edge with its shove-ice wall on one side of the frame, and the fire's feathered held-ground rim on the other. As close as the dolly clamp allows. | As `03`, with the camera driven to a cell the board reports as held *and* touching frost. |
| `07-ground-given-up-…` | **Ground given up during the crisis (M21)**, with the pull-back's own preview beside it: the churned dark band that has been abandoned, ringed by the raised outlines of the ring a second pull-back would take. | One round played, then `abandon` declared and the batch **missed**, so the ring goes and nobody is hardened. |
| `08-ground-scar-after-the-thaw-…` | **What that ground is one season on (M19).** `ScarredGround`'s ash slab under its 45-degree hatch, on green tussock in fair-weather light — the same cells, the other layer. | The same board's abandoned cells handed to the city as `crisis_damage.ruined_cells`, with the winter over. See the note on the reclaim below. |
| `09-protection-five-states-…` | **The five building protection states on one island (M15, M16, M17, M18)**, wide enough to hold all five and the plain neighbour they are read against. | A board carrying all five at once, which no sequence of clicks reaches: `shield` from the tuning's own ladder, `damage` at `ruin_at - 1`, one ruin, one reinforce candidate, and one building the frost reaches. |
| `10-protection-five-states-close-…` | The same board and the same instant at the player's own zoom, which is where the pairwise reading happens. | As `09`. |
| `11-protected-NUM.S-…` | **Protected.** The storm roof, its ridge, its battens, its stone weights and its banked berm, on the island. | One building given `reinforce.shield_by_tier.steady` and nothing else moved. |
| `12-frosted-NUM.S-…` | **Frosted.** The frost crust on the **same building**, same plot, same camera, same board. | The same building given `damage.ruin_at - 1` points instead, which is the most a standing building can carry at any tuning. |
| `13-badge-threatened-…` | **The threatened badge.** A double chevron driving downward above the roofline, in the ice front's own tone. | The opening board with the frost holding the shoreline band, so the rim building is threatened by where it stands. |
| `14-badge-lost-…` | **The lost badge.** A broken cross with a gap at its centre, over the ruin of the same building, from the same camera. | The same board with that building taken to `state: "ruin"`. |
| `15-badge-shielded-and-threatened-…` | **The overlap the reinforce mechanic exists to produce**, and the frame two indicators would most easily ruin for each other: the shield on the building's own geometry, the threat on a billboard above everything the shield added. | The same board with the threatened building also carrying a shield. |

**The three `03` frames hold the board and move only `rounds_left`, and that is the comparison
rather than a shortcut.** The design's own invariant is that duration is not width — *"a fire
drawn narrower as it burns down is a fire that covers less ground, which is the one reading this
frame exists to prevent"* — and played forward instead, the frost advances between the rungs and
the held ground moves with the board, so three played frames could never show it. The capture
asserts that the set of held cells is identical across the three, which is the caption's own
truth condition.

**`11` and `12` are the pair to watch**, and they are an A/B on one building rather than two
buildings side by side, because two buildings carry a confound: a difference between them could
be the models rather than the treatments. Flip between the two files and the only thing that
moves is the treatment.

**The other half of M21 — ground bought back — is an absence, so it is stated rather than
shown.** A reclaimed cell leaves `ruined_cells` and the layer draws nothing at all for it, by
the 2026-08-01 ruling that `#399` landed. The reclaimed ground in `08` is therefore the ordinary
tussock beside the scar, and there is no mark for a photograph to find. That is a fact about the
code rather than something a picture can establish, so the capture asserts it instead.

### Frame `05` used to be a photograph of a board the engine cannot reach

**And a flag is why nobody saw it.** This capture merged as #420 at 12:04 on 2026-08-02, when
`closeRound` deleted a fire whose fuel ran out, so the burnt-out fixture asserted `state.fires`
empties and the frame it took was of a **bare cell**. At 13:26 the same day,
#416 — *"a spent hearth is a state on the board, not a deletion from it"* — landed and kept the
fire. From then on every run of this capture reported *"expected 1 to be 0"*, and **no CI run could
tell**, because the assertion lives inside a `test.runIf(SHOTS)` and the frames are behind
`VITE_WINTER_SHOTS`. So the state `winterFire.ts` calls `spent` had no frame here at all, and the
one filed under its name showed the absence the engine had stopped producing.

The fixture now plays until the engine's own `winterFireState` reads `spent` and asserts that in
both directions — a board that dropped the fire fails, and a board still burning fails.
`docs/design-refs/hard-winter-art-fix/09-burnt-out-fixture-1024x580.png` is the pair.

### Two things the frames do not say, named rather than left to be discovered

1. **The sidebar in `04` is running its own board.** `WinterInCity` owns a `HardWinterState` of
   its own, and the boards these frames need are ones no sequence of clicks reaches, so the
   constructed board is handed to the canvas directly — exactly as `CitySurface` hands over the
   published one, and exactly as `winterProtectionStates.browser.test.tsx` does it. The panel is
   therefore the real component at its real width over the real island, and **its round counter
   does not describe the canvas beside it.** That frame is evidence about the panel's footprint
   and about nothing else it says.
2. **`WinterDevSkip` is hidden in every frame.** It gates itself on `isDevPersistenceEnabled()`
   — `VITE_DIAGNOSTIC_API_URL` unset — which is true in the test harness and false for a
   learner, so it is a control that ships to nobody, and it sits over the island's top-right
   corner. It is the only thing removed from any of these pictures.

## What looking at all seventeen turned up

The frames are worthless if nobody reads them, so the reading is
`work-log/gabe/2026-08-02-photographing-the-hard-winter.md`. In short, and every number below is
measured off the committed pixels:

- **Protected and frosted are not confusable, and the brief's stated worry does not describe
  what ships.** The pack expected "both put a pale mass over a building". Over the 31,974 pixels
  that change between `11` and `12`, the storm roof's mean is `rgb(94, 70, 49)` — warm dark
  timber — and the frost crust's is `rgb(121, 137, 135)` — cool pale grey. Only one of the two
  is pale, and it is the one at the building's foot rather than over its head.
- **⚑ The storm roof covers the building it is on.** Over the tower's own on-screen box, 34% of
  its pixels survive being shielded; over the roundhouse's dome, 2% do. `frostStage.ts` carries
  an explicit constraint against exactly this for the crust, with a rendered guard in
  `frostCrustSilhouette.browser.test.tsx`; `winterShield.ts` has no equivalent. **Reported, not
  fixed** — presentation is not this pass's to redesign. **→ ACTED ON 2026-08-02.** The cap is an
  open gabled frame rather than a closed membrane and its rise is banded against the building's own
  measured height; `winterShieldSilhouette.browser.test.tsx` is the guard `frostStage.ts` had and
  this file did not, and it swept nine building shapes at 1% to 54% before the fix. The frames above
  were re-taken and `docs/design-refs/hard-winter-art-fix/` holds the pairs. **THOSE RE-TAKES ARE OF
  A LARGER FRAME THAN SHIPS.** They were captured at `MAX_RISE_RATIO` 0.62 and `RAFTER_SPACING` 2.3u;
  #465 then took both down to 0.42 and 3.2u on its own frames, having found that a gable 62% of a
  hut's own height reads as a cage around the building and a slope crossed at 2.3u as scaffolding in
  front of it. It also replaced the flat survival floor with one derived per building, because a flat
  half declared the Lookout — the building the lead named — acceptable at 60%. For the roof as it
  ships, read `../winter-storm-roof/`.
- **The two ground boundaries read as two different kinds of edge**, which is what `06` was
  taken for.
- **⚑ The fuel ladder's invariant holds perfectly and its read is eight pixels.** Across the
  three `03` frames the held ground is identical, exactly as #407 designed — and at the closest
  view the game's own zoom control reaches, the whole difference between three rounds left and
  one is **313 pixels inside a 25 x 30 box**, with the flame's bright core going 25px tall to
  22px to 17px and its top edge descending 8px. #407's own ladder frames are taken at
  `cameraDistance * 0.22`, which is 2.3x closer than `VILLAGE_CAMERA.minDistanceRatio` lets a
  player get. **Reported, not fixed** — whether the read is worth more than that is the lead's
  call, and `winterFire.ts` already raises the same question about the stack. **→ STILL OPEN as of
  2026-08-02, and now measured at the shipped camera rather than a close one.** The flame's own
  legibility was fixed (it was resolving to a cream paler than the snow, so there was nothing
  visible to shrink: 14 fire-coloured pixels against 245 now), but the ladder's MAGNITUDE is
  untouched — about 340 changed pixels in a 25x30 box either way, with the flame going 245px to
  200px to 160px and its top edge descending 11px at 1024x580. That is a close-zoom second reading
  and not a mechanic a player can count. It needs a design change rather than an art one; see
  `docs/design-refs/hard-winter-art-fix/README.md`.
- **A hearth that never caught is a small grey lump**, and at the shipped camera it is the one
  state in the fire's four that does not announce itself.
- **Every winter frame here has open water down its left side, and that is the renderer being
  right.** `winterFraming` slides the projection into the strip the crisis panel leaves free
  whenever a winter board is on the canvas — including in a frame taken with the panel hidden.
  `08`, the only frame with no winter board, is centred and fills the viewport. Read the
  compositions with that in mind rather than as design.
