# The era progression as a presenter will see it

Five states of the era-advance ceremony, photographed **on the demo route itself** at
**1024x580 under reduced motion** on a live `npm run dev`: title screen → Take Diagnostic → the
dev *All right* rung → back to the city → ☰ Menu → Advance the age, then the ceremony's own dev
hatch to stand on each beat. `docs/Demo_Era_Progression_Runbook.md` is the click-by-click route.

Regenerate with `output/ceremony-beat-frames.mjs`.

## Why these exist beside `../era-advance-beats/`

That directory is the 2026-08-01 change's own evidence and is taken from the browser-test
harness on a bare `CitySurface`. These are the same beats **on the city a presenter will
actually have on the projector**, which differs in three ways that all show:

- the diagnostic has unlocked six buildings and **placed none of them**, so the island is empty
  and the population is eight;
- the frames are under **reduced motion**, which the other set is not;
- the hatch stands one live sitting on each beat, where the other set remounts the whole surface
  per state.

Every frame is the whole 1024x580 window rather than a crop, because the question is what is
visible *behind and around* the ceremony, and cropped to the thing that changed a screenshot
proves nothing about occlusion. `NN-*.png` is the composite with the dev panel folded to its
chip; `island-only-NN-*.png` is the same moment with the whole ceremony layer hidden.

## What each one shows, read rather than described

| file | what is actually in the picture |
| --- | --- |
| `00-before` | The ceremony open on its first question. The island is untouched and **you can see all of it** — shore, sea, the hall in the middle. This is the framing the other four are judged against. |
| `01-gathering` | ⚑ **The lens closes so far that there is no island in the frame.** Since #475 beat one is a close shot on the gathering ground, and at 1024x580 on an empty city that means: grass filling the whole picture, the scaffolded hall cut off by the bubble, and the crowd reduced to a thin row of eight figures across the very top, partly behind the MASTERED and CITY LIFE panels. The beat is working — the crowd gathered, the hall scaffolded, Oru changed into the grain keeper's clothes and register — and it does not read as a city gathering. Measured: 56.78% of the island-only frame changes from `00`, and nearly all of it is the camera. |
| `02-expansion` | The lens releases and the whole island is back. The survey line is pegged out round a wider shore and the drawn grass has walked out. Most of this state's 56.98% is the camera coming back rather than the land. |
| `03-rebuild` | The scaffold is gone and the hall stands rebuilt. At this framing the hall is about forty pixels across, so the beat is **0.51%** of the frame — true, and very quiet. |
| `04-retheme` | ⚑ **SUPERSEDED BY #521.** As photographed here the ground does not turn: 03 and 04 differ by **0.57%** and the grass is the same green in both. That was a defect rather than the design, and it is fixed — the same beat moves **5.66%** now. See the note below and `../era-two-fields-fill-the-ring/`. |

## ⚑ SUPERSEDED BY #521 — the beat-four half of this file, and the frames above it

**The `04-retheme` row in the table above and the section below it are a picture of a defect that
has been fixed.** The frames are kept because they are the evidence the defect existed, and
because `01-gathering` is still current; what has changed is why beat four was quiet, and the
answer turned out not to be the one this file gives.

Era two's ground was never going to be a new colour — its style guide says the untouched half of
the island *"is era one's exactly and is not re-authored"* — so *"standing crop, which is green
against era one's green"* was the right observation about the wrong surface. What era two has is
**worked ground**, and it was being sized off era one's 2.8-unit margin ring while era two's
island is drawn with a 10.8-unit one, and laid on the outgoing era's island rather than on the
land beat two had just opened. Beat four moves **5.66%** of the frame now, against the 0.57% and
1.23% below. `../era-two-fields-fill-the-ring/` is the before-and-after pair.

The per-era table below still stands for every row but its first, and those five rows have not
been re-run since.

## Beat four, and why the number was not a bug report

`../era-advance-beats/README.md` recorded this beat as a 33.66% change and described it as *"the
whole island has turned"*. That is what its frames show, and both facts have since changed:

- `ERA_ISLAND_GROUND` carried `prehistoric` alone when those were taken, so era two fell through
  to `UNAUTHORED_ISLAND_GROUND` and the island turned **placeholder grey**. The dramatic figure
  was the fallback.
- Era two's ground has since been authored (`ERA_TWO_TERRAIN`) as worked soil under **standing
  crop**, which is green — against era one's green grass, at this zoom, on a 1024px frame.

So the beat is doing exactly what it is told and the payoff has gone. Re-running the other
directory's own harness at this tip reproduces it: `04-retheme` is **1.23%** there now, against
the 33.66% its committed text still quoted.

**No later transition rescues it.** `output/ceremony-retheme-by-era.mjs` walks the first six
pairs: 0.57%, 53.31%, 0.04%, 0.00%, 0.00%, 0.00%. The 53.31% is Neolithic → Bronze Age, and it
is the island going placeholder grey rather than authored Bronze Age art, because era three is
the first era with no authored ground. Everything after it is the placeholder against itself.

## How long a beat takes

Every beat is at rest by the first sample after the press, and the instrument's own floor —
the identical loop run over a scene nobody touched — is 3.5 to 6 seconds a sample. So **under
3.5 seconds is a bound, not a measurement**, and the numbers in `measured-1024x580.txt` are the
slower whole-window loop and should be read the same way.

Under reduced motion a beat is a **hard cut**: six consecutive captures taken from the instant
of the press are identical and the first already shows the finished state
(`output/ceremony-timing/burst-gathering-*.png`). Under full motion beat two eases, because the
shoreline walks out on a 0.22s time constant; the camera does not, since the ceremony lens is a
direct function of the beat's progress.
