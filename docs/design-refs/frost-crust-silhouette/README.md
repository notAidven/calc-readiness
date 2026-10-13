# The frost damage crust, banded against each building's own height

The rendered evidence behind `MAX_SHELL_RATIO` in `apps/web/src/city/three/frostStage.ts`, which
used to be a fraction of `MAX_BUILD_HEIGHT` (a cap no era-one building comes within 14 units of)
and is now a fraction of the height the building it is on actually renders at.

## Why these are committed, when `__screenshots__/` is gitignored

`.gitignore` excludes `**/__screenshots__/` because what lands there is regenerated on every run
and is meaningless afterwards. These are the same pixels kept for the opposite reason, and it is
the reason `crisis-panel-width/README.md` gives: this is a SPATIAL claim, the arithmetic under it
was right for two months while the screen was wrong, and a reviewer who cannot see the frames is
being asked to take a measurement on trust. The cloud agent that produced them has no way to
inline an image into a pull request.

## What the defect was, in numbers

`MAX_BUILD_HEIGHT` is 24u and caps nothing era one ships. Measured off the shipped GLBs, through
the same contain-fit the scene uses, and confirmed against the rendered scene graph:

| node | building | plot | renders |
| --- | --- | --- | --- |
| `NUM.3` | Workshop | 1x1 | **1.828u** |
| `NUM.F` | Store | 2x1 | **2.149u** |
| `NUM.2` | Dwellings | 2x2 | 2.608u (the figure `worldLayout.ts` records) |
| `town-hall` | Civic Center | 3x2 | 3.096u |
| `NUM.4` | Commons | 1x2 | 3.774u |
| `NUM.S` | Assembly Hall | 2x2 | 4.821u |
| `NUM.5` | Tower | 2x2 | 9.769u |

At `MAX_BUILD_HEIGHT * 0.16` the crust's crest stood 1.395u / 2.790u / 4.186u at stages one, two
and three, the same on every building. As a share of the building it was on, that is:

| node | stage 1 | stage 2 | stage 3 |
| --- | --- | --- | --- |
| `NUM.3` Workshop | 76% | **153%** | 229% |
| `NUM.F` Store | 65% | **130%** | 195% |
| `NUM.2` Dwellings | 54% | **107%** | 161% |
| `NUM.4` Commons | 37% | 74% | 111% |
| `NUM.S` Assembly Hall | 29% | 58% | 87% |
| `NUM.5` Tower | 14% | 29% | 43% |

Stage two is the only stage a standing building can reach at `HARD_WINTER.damage.ruin_at: 2`, so
the middle column is what shipped. Banded against each building's own height every row of that
table reads 14.5% / 29% / 43.6% instead, and the Tower moves by 1.9%.

## What each frame is

Every frame is at **1024x580**, the lead's own short laptop window, and the viewport is in the
filename because a frame whose viewport is unstated says nothing about anybody's screen. The tilt
is the game's own `VILLAGE_CAMERA.polarAngle`, the 49 degrees of elevation at which the drifts
hide the foot of a wall.

The three buildings in the row frames are era one's two SHORTEST (`NUM.3` the Workshop and `NUM.F`
the Store, the two the cap buried) beside its TALLEST (`NUM.5` the Tower, the one building the
crust was ever judged on). All three are in shot together because the question is a comparison.

| file | what it shows |
| --- | --- |
| `reference-stage-0-*` | The three unmarked, which is what a reviewer is comparing against. Before and after came back BYTE-IDENTICAL here, so there is one file: the change touches nothing on an undamaged building. |
| `before-stage-1-*` / `after-stage-1-*` | Stage one. Unreachable at the shipped tuning; the before crust is already 76% of the Workshop. |
| `before-stage-2-*` / `after-stage-2-*` | **The pair that matters.** Stage two is the only appearance a standing damaged building wears today. Before: the Workshop and the Store are featureless pale blocks with a badge over them and no building visible at all, while the Tower beside them still reads as a tower on a rimed base. After: all three read. |
| `before-stage-3-*` / `after-stage-3-*` | The worst stage. Before, the two short buildings are gone entirely and the Commons and the Assembly Hall are going. |
| `before-island-marked-buildings-zoomed-*` / `after-*` | The same claim on the real island, at the player's own zoom control (three notches of `applyCameraAction`), with four marked buildings on one board. Before: three of the four are pale blocks. This is the pair to look at if you only look at one. |
| `before-island-marked-buildings-*` / `after-*` | The island at the crisis's own default framing, sidebar hidden, which is how small the game actually draws these buildings. |
| `before-in-game-marked-buildings-*` / `after-*` | The whole screen, with the real crisis sidebar and the dev panel exactly where a reviewer has them. |

## What the frames show that the arithmetic did not

**At stage one the crust on the two shortest buildings is invisible.** It is 0.263u on the
Workshop and 0.313u on the Store, and `winterScene.ts` banks a drift `DRIFT_MAX_H` = 0.9u high
against the windward walls, so the crust is under the snow that is already there. It cannot be
fixed by raising the ratio: clearing a 0.9u drift on a 1.828u building needs 49% of the building
at stage ONE, which is past what the file's third constraint allows at stage three. It costs
nothing today, because stage one is unreachable at `ruin_at: 2`, and it is a real constraint on
any future `ruin_at` that makes stage one reachable.

**The drift itself is the same substitution one file over, and it is not fixed here.**
`DRIFT_MAX_H` is a flat 0.9u for every building where the design batch asks for
`min(0.9, wallHeight * 0.28)`, and its docblock argues the cap binds because *"six of era one's
seven placements render taller than [3.21u]"*. Measured above, **three** of the seven do: the
Workshop, the Store, the Dwellings and the hall are all under 3.21u, so the 0.28 term wins for
four of seven and the drift is eating 49% of the Workshop's wall. Reported rather than changed,
because it moves every winter frame on the island and that is an art call.

## Regenerating them

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/frostCrustSilhouette.browser.test.tsx
```

which writes to `apps/web/src/city/three/__screenshots__/frost-crust/`. The `before-` set was
taken with `frostCrustHeight` reverted to `MAX_BUILD_HEIGHT * 0.16 * (step / stages)` and nothing
else changed, which is the same one-line injection that proves the guard in that file goes red.
