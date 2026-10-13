# The re-theme beat, before and after: era two's fields on the island the beat has opened

The rendered evidence behind the change that took the era ceremony's fourth beat from moving
**0.62%** of a 1024x580 frame to moving **5.66%** of it, for a reason a viewer can name.

Every frame here comes from this repository's own committed harness,
`apps/web/src/city/eraAdvanceOnTheIsland.browser.test.tsx`, at **1024x580 under reduced
motion**, with the advisor hidden so the speech bubble's own height cannot count as the island
changing. `../era-advance-beats/README.md` is that harness's own directory and argues at length
why the naive comparison — diffing the composite frames — is confounded; nothing here re-decides
it.

## What each file is

| file | what it shows |
| --- | --- |
| `before-island-only-03-rebuild-1024x580.png` | Beat three at `df9fe3e7`. The hall stands rebuilt; the island is green. |
| `before-island-only-04-retheme-1024x580.png` | Beat four at `df9fe3e7`. **0.62% of the frame differs from the frame above it.** Era two's dozen worked plots are in there — a hoop of 2-unit smudges at radius 26 on an island whose grass reaches 38. |
| `after-island-only-03-rebuild-1024x580.png` | Beat three on the merged tree. Unchanged, which is the control: nothing before beat four moves. |
| `after-island-only-04-retheme-1024x580.png` | Beat four on the merged tree. **5.66%.** A dozen worked plots in four states ring the settlement, the buildings still stand on the pale disc, and the pale standing crop reads as crop. |
| `before-04-retheme-1024x580.png`, `after-04-retheme-1024x580.png` | The same two moments as the **composite** — the advisor over the island, which is what the composition is judged on. |
| `after-ring-standing-crop.png`, `after-ring-stubble-and-fallow.png` | Two of the four ring frames from `three/eraTwoField.browser.test.tsx`, at the ~48° elevation the game's camera has, so the four plot states can be read close up rather than inferred from a 40-pixel patch. |
| `*-measured-*.txt` | The per-beat numbers as the harness wrote them, at both viewports. |

## The numbers, both viewports

| beat | before, at `df9fe3e7` | after, on the merged tree |
| --- | --- | --- |
| 01 gathering | 87.38% | 81.71% |
| 02 expansion | 87.22% | 81.55% |
| 03 rebuild | 0.51% | 0.51% |
| **04 retheme** | **0.62%** | **5.66%** |

and at 1440x900: 81.71 / 82.45 / 0.56 / **0.67** before, 79.14 / 79.89 / 0.55 / **6.13** after.

**Beats one and two are the ceremony LENS, not the island.** Since #475 the frame closes hard on
the gathering and opens again as beat two surveys the new shore, so those two numbers are the
camera being re-projected rather than the island changing — which is also why they move a few
points between runs while beat three and beat four hold to a hundredth. They are quoted so
nobody reads 5.66% as small beside 81%: the numbers being compared are beat three's 0.51% and
beat four's 5.66%, both taken at the same framing.

**The after column is re-measured on the merged tree** (`#504`, `#514`, `#515`, `#519`, `#520`,
`#502` and `#511` forward-merged) rather than carried over from the run that produced the
change. Three independent runs across those merges: 5.66% at 1024x580 every time, and 6.12 /
6.13 / 6.13% at 1440x900. The before column is still the run at `df9fe3e7`,
which is sound because none of those five touches the island's geometry or its dressing — `#504`
extracts an advisor stage and `#514` is the Album — and the harness's own noise is a few tenths
of a point.

## The two defects, and they are the same defect twice

**Era two's fields were sized off era one's ring.** `WORKED_PLOT_LOBE_MIN`/`_JITTER` were two
constants derived from era one's 2.8-unit margin (`ISLAND_GRASS_RADIUS` 30, less 2.2, less 25),
with the derivation written beside them. Era two's island is drawn at grass **38**, so its ring
is **10.8 units** and a plot may be nearly four times as wide. `workedPlotSize` does that
derivation at render time from the ring the era has.

**The ceremony dressed the incoming era's ground onto the outgoing era's island.**
`CitySurface`'s layout is keyed on the standing era and moves once, at the hand-off; beat four
swaps `islandEra` a press earlier. So era two's fields sat in a hoop at radius 26 while the land
reached 38, and the eight units beat two had just opened were left undressed.
`islandDressingRadius` hands the island the radius its era's land actually has.

## What is NOT changed, and why the palette is not the lever

Era two's style guide is explicit that the untouched half of the island *"is era one's exactly
and is not re-authored"*, so there is no era-two ground pigment to transcribe and inventing one
would ship unratified art — the bar `islandGround.ts` already holds for eras three to ten. What
the guide does author is coverage: *"the island reads in two families for the first time: ground
somebody has broken, and ground nobody has touched"*, and a furrow rule — *"no two adjacent
plots are furrowed the same way, which is what stops a dozen fields reading as one striped
carpet"* — that only means anything about plots big enough to run into each other. Not one hex
moved in this change.

## ⚑ These are the harness's built city, not the demo's starting state

The harness mounts `CitySurface` with its six buildings standing and 22 citizens. The demo route
opens on a city with six buildings **unlocked and none placed**, and the frames for that state
live on `#511` behind its dev hatch, which is not on `integration`.

The difference does not touch this claim, and the direction is worth stating: buildings stand on
the buildable disc inside radius 22 and the fields are outside radius 25, so an unplaced city
has strictly **more** island ground in frame at beat four, not less.

## Regenerating them

```
VITE_ERA_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/eraAdvanceOnTheIsland.browser.test.tsx
```

which writes into `../era-advance-beats/`; the pairs here were copied out of two runs of it,
either side of the change. The ring frames come from
`npx vitest run --config vitest.browser.config.ts apps/web/src/city/three/eraTwoField.browser.test.tsx`,
which runs in CI and writes to a gitignored `__screenshots__/`.
