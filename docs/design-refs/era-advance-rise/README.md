# The land coming up out of the lagoon, through the rise

The rendered evidence behind the 2026-08-04 change to the era advance's growth beat.

> *"on the third beat, instead of the island growing the land should come out of the water."*

**His third beat is `expansion`**, which is the beat that grows the island: `eraCeremonyStage.ts`
moves `landRadius` with `survey` and `survey` is `through(state, "expansion")`. He counts the
beat he presses into as the first. **`rebuild` grows nothing and gained nothing here.**

## What changed, in one paragraph

The apron's leading edge used to slide outward at its finished height, so new ground came into
existence already dry, at grass level, with a fully formed beach translating rigidly ahead of
it: no fixed point of ground ever moved vertically. Now the shelf reaches the earned extent
immediately, sitting **3.4 world units** under its finished height — which is under the lagoon's
own surface, a floor derived from `SHORE_PROFILE` and `WATERLINE_Y` rather than chosen — and a
**3.2-unit** front sweeps outward bringing each radius up through the water, with a **6.5-unit**
band of dark, wet ground trailing behind it that dries as the front leaves it.

## ⚑ WHY THESE ARE POSED RATHER THAN TIMED, and it is a measurement

A clipped `Page.captureScreenshot` costs about **880ms** on this runner, measured over three
runs. The rise is over in about **1.5 seconds**. So a live canvas cannot be photographed through
its own travel, and a timed schedule proves it: a nominal `[180, 420, 780, 1300, 2100, 3600]`
came back at real times of **882, 1765, 2606, 3633, 4840 and 8184ms**, with `53.0%, 2.5%, 0.6%,
0.0%, 0.0%` of frame movement between the six — one boundary inside the rise and four after it.
Two frames either side of an event are exactly the pair that proves nothing, which is the whole
reason this directory exists beside `../era-advance-beats/`.

`risenOverride` poses the shelf instead. It moves WHEN the front is somewhere and never WHERE,
so `01`..`06` are frames of the same geometry the animation walks through, at points a timed
capture cannot reach. **`08` and `09` are the live animation** either side of one real answer,
which is what says the poses are moments of something the game actually draws: 25.2% of the
frame was still moving at the first capture the instrument can take.

## What each one is

Every frame is the shipped `CityScene` — its own `Canvas`, its own `CityFrame`, its own
`StarterIsland`, its own `NewGround` — driven through the real `ceremonyCityStage`, at
**1024x580**, the lead's own short window, which is in every filename.

| file | what it shows |
| --- | --- |
| `00-before-the-answer-*.png` | Act two open, no answer given. The lagoon the land is about to come out of. |
| `01-rising-0pc-*.png` | The answer has landed. The whole new annulus is under water; the camera has made room for it. |
| `02-rising-20pc-*.png` | The front is coming up. A wide dark ring of soaking ground has broken the surface. |
| `03-rising-35pc-*.png` | The ring is wider and further out, and the inner half has begun to dry. |
| `04-rising-50pc-*.png` | **The widest wet band**, at 2,546px of just-surfaced ground against 624 on the settled island. |
| `05-rising-70pc-*.png` | Mostly dry behind, still wet at the frontier. |
| `06-rising-100pc-*.png` | The land is up. The finished island, indistinguishable from the one that shipped. |
| `07-reduced-motion-*.png` | The `prefers-reduced-motion` state: the finished island, posed on the frame the answer lands. Not a half-risen shelf. |
| `08-live-mid-travel-*.png` | The LIVE animation, first capture after a real answer. |
| `09-live-settled-*.png` | The same live canvas, settled. |

`measured-1024x580.txt` carries the pixel counts these were read off.

## ⚑ THE CAMERA HAD TO BE DECOUPLED FROM THE LAND, and the first set of frames is why

`cityFraming.ts` fits the DRAWN island into the viewport, so the frame widens as the land
reaches further — and `beatTwoGrowsTheIsland.browser.test.tsx` states the consequence: *"a grown
island is not a bigger shape in the frame. It is the same shape with smaller things standing on
it."*

Fine for a shoreline sliding outward, fatal for a rise. With one eased value driving both the
land and the frame, everything on screen shrinks at about the rate the new land arrives and the
two very nearly cancel: the first set shot this way read as a slow zoom-out with the island the
same shape in every frame. So the camera makes room on its own, much faster ease
(`CAMERA_LEAD_TAU_SECONDS` 0.1 against `RISE_TAU_SECONDS` 0.55), and is then STILL for the last
four fifths of the rise. **A fixed frame is what makes emergence legible**; the island in
`01`..`06` is in the same place and at the same size in all six, which is the point.

## ⚑ AND THE WET BAND IS A FACT ABOUT THE RISE, not about height, for a reason nobody chooses

Toning the ground by height alone was the first attempt: land dries as it lifts. True, and
nearly invisible, because the finished new flat stands **1.45 world units** above the lagoon's
surface, so the whole ladder from drowned to dry has to fit inside 1.45 units of height and
`SHORE_PROFILE` already spends all of it on the beach. Photographed at 1024x580, the widest band
it could produce was **667 pixels against 624** on the settled island: 43 pixels of difference
over a 594,000-pixel frame, which is not a picture of anything.

So wetness is how recently the front passed, over `DRY_TRAIL`, times how much rise is left. The
second term is what keeps it honest: it is zero the moment the front arrives, so the settled
island is the one that shipped at every radius, and it reads correctly on its own terms too, in
that by the time the last of the land is up everything behind it has had time to dry.

## Regenerating them

```
VITE_LAND_RISE_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/landRisesFromTheSea.browser.test.tsx
```

Gated off by default for the reason four neighbours already record: a full shadow-mapped scene
is the heaviest thing in that suite, and a heavy scene left on starves an animation-timing
assertion in a different file rather than failing in this one. The geometry, the depth, the ramp
and the tone ladder are held always-on by `apps/web/src/city/three/newGround.test.ts`.
