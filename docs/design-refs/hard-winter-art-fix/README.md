# The storm roof and the fire, before and after, at 1024x580

> **THE ROOF IN THE SHIELD PAIRS BELOW IS NOT THE ROOF THIS TREE BUILDS, and the fire pairs are.**
> These frames were taken on #449's branch, at `MAX_RISE_RATIO` 0.62 and `RAFTER_SPACING` 2.3u.
> #465 then retuned both from its own frames — 0.42 and 3.2u — on the reading that a gable 62% of a
> hut's own height reads as a cage around the building and a slope crossed at 2.3u reads as
> scaffolding in front of it. So `01`, `02`, `03` and `04` are a true record of the argument that
> got the membrane replaced by an open frame, and they overstate the frame the game now draws.
> **For the roof as it ships, read `../winter-storm-roof/` instead**, which is #465's own
> per-building derivation photographed at the same 1024x580. Nothing here has been re-taken,
> because a before-and-after pair loses its meaning the moment one side is replaced.

The lead played era one's Hard Winter on a QA build and said: *"the changes look horrible: the
shield looks terrible and the fire still looks trash."*

Every pair below is the **same fixture, the same board, the same camera and the same viewport**,
with one side taken before this branch and one after. Both sides come out of
`winterCrisisAtlas.browser.test.tsx` — the capture that produced
`docs/design-refs/hard-winter-crisis/` — so the compositions are not chosen and nothing is cropped
to flatter a subject. Where a pair is enlarged, it is enlarged from the 1024x580 frame with nearest
neighbour, so what you are looking at is the pixels a player gets and not a re-render at a
friendlier scale.

**Regenerate the source frames with:**

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/winterCrisisAtlas.browser.test.tsx
```

## The viewport, and the camera

1024x580, the lead's own short laptop window, named in the filenames of the source frames. The
camera is the game's own: `VILLAGE_CAMERA.polarAngle` (49 degrees of elevation) at `CityScene`'s
fov 32, framed by `winterFraming` because a crisis panel is on the island, which works out to
**9.99 pixels per world unit**. The close pairs get closer only by enlarging the same frame.

**The 1.52x widening `#419` landed is not in any of these frames, and that is checkable rather than
asserted.** `cityFrameFor` applies exactly one framing, and while a winter is on the canvas it is
`winterFraming`'s, not `islandFraming`'s. `#419` touched `winterFraming.ts` only to move the
`setViewOffset` arithmetic into `cityFraming.ts`; it changed no number on the crisis path. Measured
through both: the crisis frame is **1.4669x** and reads 9.99px per world unit, and the default
frame is 1.5209x and reads 9.64px — so the island is 3.7% **larger** during a crisis than in the
ordinary city view, and the shield and the fire render nowhere else.

**The frames say the same thing from the other direction, and this was found rather than looked
for.** `#420` committed the seventeen frames 82 minutes before `#419` merged, so every one of them
predates the widening. Re-taken at the current tip with the art untouched, sixteen came back
byte-comparable — and **`08-ground-scar-after-the-thaw`, the one frame in the set with no winter
board on the canvas, came back 84% different.** It is the only frame drawn through `islandFraming`,
and it is the only frame the widening moved. `11-the-widening-moved-only-the-fair-weather-frame.png`
is the pair; the island overflows the viewport on the left and fits it on the right.

## The pairs

| file | what it shows |
| --- | --- |
| `01-shield-on-the-island-1024x580` | A shielded building on the island, as a player sees it. |
| `02-shield-close-read` | The same pixels at 3x. **Before, the roundhouse's dome is not in the picture at all.** |
| `03-shield-and-threat-1024x580` | The Lookout, shielded and threatened. Before: legs, platform, ladder and pitched cap gone under a brown wedge. |
| `04-five-states-zoomed-1024x580` | Five protection states at the player's own zoom. The point of this one is how much of the settlement the shielded building was taking. |
| `05-fire-on-the-island-1024x580` | A fire with three rounds left. |
| `06-fire-close-read` | The hearth at 5x. Before: a cream blob with a dark grey lump on top of it. |
| `07-smoke-column` | The column at 3x. Before: near-opaque separated lumps in cool grey. |
| `08-fire-proposed-1024x580` | The reinforce/fire preview, which is the same hearth ghosted, so it inherits the flame's fix. |
| `09-burnt-out-fixture-1024x580` | **Not an art change.** The atlas's burnt-out fixture had asserted a board the engine stopped producing, so frame `05` was a photograph of an empty cell. This is the spent hearth that actually ships. |
| `10-fuel-ladder-last-rung` | One round left at 5x, against `06`'s three. This is the pair the fuel-ladder question turns on. |
| `11-the-widening-moved-only-the-fair-weather-frame` | **Not an art change either.** The one frame in the atlas with no winter board, as `#420` committed it and as it comes back at the current tip. It is the only frame `#419` moved. |

## What the pairs are evidence of, in numbers

Measured on the committed pixels, in the hearth's own window of the 1024x580 frame, and in a drawn
scene for the shield (`winterShieldSilhouette.browser.test.tsx`).

**The shield.** Over nine building shapes, the share of each building's own pixels that survive
being shielded — under the roof alone, and then under the whole shield with its banking:

| node | renders | under the roof | with the banking |
| --- | --- | --- | --- |
| `NUM.S` | 4.821u | 34% → **67%** | 21% → **54%** |
| `NUM.F` | 2.149u | 20% → **68%** | 3% → **58%** |
| `NUM.2` | 2.608u | 10% → **70%** | 1% → **63%** |
| `NUM.3` | 1.828u | 10% → **59%** | 1% → **51%** |
| `NUM.4` | 3.774u | 48% → **70%** | 25% → **49%** |
| `NUM.5` | 9.769u | 66% → **78%** | 54% → **67%** |
| `EXP.1` | 5.527u | 32% → **66%** | 24% → **58%** |
| `RAD.1` | 7.255u | 27% → **69%** | 21% → **62%** |
| the hub | 3.096u | 3% → **68%** | 1% → **67%** |

**The fire.** Pixels in the hearth's window that are both saturated and bright — that is, pixels
that read as fire rather than as pale ground: **14 → 245** at three rounds left. The flame's mean
colour over those pixels goes from a cream that is paler than the snow it stands on to a saturated
amber.

**The fuel ladder is the one thing here that did not really move, and it is reported rather than
claimed fixed.** The pose is untouched, so the magnitude of the change between rungs is what it
was: about **340 changed pixels in a 25x30 box** of a 594,000-pixel frame, before and after. What
changed is that the thing which shrinks is now visible — the flame goes **245px → 200px → 160px**
of fire-coloured pixel over the three rungs and its top edge descends **11px**, where before the
flame registered 14, 11 and 13 pixels and there was nothing legible to shrink. An 11px descent on a
21px-wide flame at rest is a close-zoom second reading and not a mechanic a player can count.
`winterFire.ts` already puts the neighbouring question to the lead about the fuel stack; the same
question stands for the flame, and the note in that file's header is the place it is recorded.
