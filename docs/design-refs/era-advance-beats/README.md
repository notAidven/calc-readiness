# The four beats of the era advance, on the island

The rendered evidence behind the 2026-08-01 change that took the era-advance ceremony off a
modal card and put its four beats (**D-ET8**, `2026-07-29-era-trial-contract.md` §19.1) onto
the live city, with the advisor standing on the island.

**Re-shot on 2026-08-04**, when the ceremony was centred, given a name and a four-act crest, an
opening that explains itself and an arrival that names the age being entered. The beat lines
also stopped repeating and *"Leave the inspection"* became *"Pause the ceremony"*. The state
list changed with it: six frames rather than five, and the two new ones are the opening and the
arrival.

**How act two's land actually arrives is `../era-advance-rise/`.** These frames are the beat's
ENDS, which is the right subject for *"did the island get bigger"* and the wrong one for
*"does it read as land coming out of the sea"*: at both ends a rise and a slide produce the
identical picture, deliberately.

## Why these are committed, when `__screenshots__/` is gitignored

`.gitignore` excludes `**/__screenshots__/` because what lands there is regenerated on every
run and is meaningless afterwards. These are the same pixels kept for the opposite reason:
the claim being reviewed is *"the beats are happening to the island and you can still see
it"*, which is a claim about a rendered frame and cannot be settled by a dimension or by a
passing layout test. A reviewer who cannot see them is being asked to take a measurement on
trust. The cloud agent that produced them has no way to inline an image into a pull request.

## What each one is

Every frame is the real `CitySurface` with its real canvas, its real island, its real Town
Hall and its real HUD, at the game's own camera, with the ceremony opened through
`☰ Menu → Advance the age`. **The viewport is in the filename**, because a frame whose
viewport is unstated says nothing about anybody's screen, and **1024x580 is the lead's own
window** — much shorter than a developer default, which is where a `vh`-sized overlay stops
leaving room.

Each frame is the whole viewport rather than a crop of the advisor, because the question is
what is BEHIND and AROUND him. Cropped to the thing that changed, a screenshot proves
nothing about occlusion.

**There are two frames per state.** `NN-<beat>-*.png` is the **composite**, the advisor over
the island, which is what the composition is judged on. `island-only-NN-<beat>-*.png` is the
same moment **with the advisor hidden**, which is what the per-beat numbers are measured on,
and the next section is why.

| file | what it shows |
| --- | --- |
| `00-opening-*.png` | **The opening**, which the ceremony gained on 2026-08-04. The occasion's name on a crest across the top with its four acts under it, the age that is ending, what each act will do to the island, what an act costs and which age the city ends in. Before this the ceremony's first screen was a name line, one sentence and a maths question. |
| `01-act-one-open-*.png` | Act one, before the first answer. The city is untouched: hall roofed, no crowd, no survey, era one's ground. **This is the baseline the four acts are measured against**, and on the surface this replaced it was what every one of them looked like. |
| `02-gathering-*.png` | **Act one done.** The city's own citizens are massed on the open ground beyond the hall, the real Town Hall has swapped to its scaffolded stage, and the advisor's byline has moved to the incoming era's register. ⚑ **Since #475 the ceremony LENS closes on the gathering here**, so this frame is a much closer view than the baseline's and act two opens it again. Since 2026-08-04 that close-in is an OPENING frame rather than a hold: one drag, wheel or pinch and the lens gives the camera back for the rest of the sitting. |
| `03-expansion-*.png` | **Act two done.** ⚑ **THE ISLAND ITSELF IS BIGGER.** The drawn grass reaches 38 where the baseline's reaches 30 (`city/islandLand.ts`), the settlement and the build grid keep their world size inside it, and the survey line is pegged along the new frontier rather than round the old shore. **How it gets there is `../era-advance-rise/`**, which is the beat photographed through its own travel rather than at its ends. |
| `04-rebuild-*.png` | **Act three done.** The scaffold is down and the hall stands rebuilt in era two's own authored building. |
| `05-arrival-*.png` | **The arrival**, also new on 2026-08-04. The whole island has turned: ground, water, vegetation and roads are the incoming era's, which at era one to two is a dozen worked plots in four states ringing the settlement (#521). The age being entered is named first and large, with the four acts under it as a record, and the one button reads `Enter the Neolithic Era`. |

Read `island-only-02` against `island-only-01` for act one, `03` against `02` for act two, and
so on. `island-only-00` and `island-only-01` are the same city: the opening asks nothing of the
learner, so nothing has happened to the island yet.

### ⚑ One of the four per-act numbers is small, and that is honest reporting rather than a defect in these frames

At 1024x580 the four acts move **89.6%, 89.8%, 1.3% and 7.2%** of the frame.

The first two are the crowd and the growth. The fourth is #521's fields, which **merged at
2026-08-04T01:32Z, after this branch had read that pull request as open**; the frames were
re-shot on the merged tree, and the retheme went from 1.4% to 7.2% across that merge, which is
the same order as the 5.66% its own report gives.

**Act three, the hall rebuild, at 1.3%** is the lead's own separate objection — *"nothing really
happens in beat 3 until the town hall actually upgrades so the users just sit there"* — measured.
What reaches the scene from that act is `hallStage`, which is `construction` for the whole of it
and `built` at the end, so the frame really does hold still between its first and last answer.
**Untouched by this pass**, and named here so it is not mistaken for something these frames
disprove. The lead's *"maybe make it shake or something to fill the time"* suggestion is still
open for it; what filled the GROWTH act instead is the rise, which needed no filler beside it.

### ⚑ BEATS ONE AND TWO ARE MOSTLY THE CAMERA, and their numbers should be read that way

When the numbers in this directory were first written, the ceremony had no lens: beat one moved
**2.38%** of the frame and beat two **66.32%**. #475 gave the ceremony a lens that closes on the
gathering and opens again as beat two surveys the new shore, so those two states are now taken
at a *different framing* from their neighbours and both diff at about **87%**. Almost none of
that is the island — it is the whole picture being re-projected.

So the per-beat comparison that is still about the CITY is beat three against beat four, which
are both at the resting frame. At the tip of `cursor/era-retheme-payoff-fd32` they are **0.51%**
and **5.66%** at 1024x580.

### ⚑ AND THE 33.66% THIS FILE USED TO QUOTE FOR BEAT FOUR WAS THE PLACEHOLDER

The set committed on 2026-08-02 records beat four at 33.66%, and that frame is not era two's
island: `ERA_ISLAND_GROUND` carried `prehistoric` alone at the time, so era two fell through to
`UNAUTHORED_TERRAIN` and the ground turned grey. Once era two's own ground was authored the same
beat measured **0.62%**, because era two's untouched half is era one's exactly and the worked
half was being laid in era one's 2.8-unit margin ring. `../era-two-fields-fill-the-ring/` is the
before-and-after of the repair and carries the whole argument.

### ⚑ Beat four has authored ground on ONE transition, and it is not the loud one

Measured across the first six era pairs on a live dev server, standing on beat three and then on
beat four with the ceremony's dev hatch, island-only, 1024x580 under reduced motion
(`output/ceremony-retheme-by-era.mjs`, frames in `output/ceremony-retheme-by-era/`):

| advance | beat four moves |
| --- | --- |
| Prehistoric → Neolithic | ~~0.57%~~ **5.66%** — see above; this row is what the fields change |
| Neolithic → Bronze Age | 53.31% |
| Bronze Age → Classical | 0.04% |
| Classical → Medieval | 0.00% |
| Medieval → Early Modern | 0.00% |
| Early Modern → Industrial | 0.00% |

**The 53.31% is not authored Bronze Age art.** `ERA_ISLAND_GROUND` has two rows, `prehistoric`
and `neolithic`, so era three is the first era that falls to the placeholder and that row is the
island going grey. Every pair after it is the placeholder against itself, which is what 0.00%
means. So beat four's payoff is authored exactly once — and since the fields were resized it is
no longer the quietest of the six.

**⚑ Five of these six rows have NOT been re-measured since.** They are #511's figures at
`b04c53b4`, taken through its own dev hatch, and only the first row is re-run above — so read
the other five as a picture of the placeholder ladder rather than as current numbers. The
conclusion they support is unchanged either way: era three is the first era with no authored
ground, and nothing after era two has any of its own.

### And four more, from the always-on guard rather than from this gated one

`land-<era>-before-*.png` and `land-<era>-grown-*.png` are beat two's own before-and-after
pair at **two different eras**, with the measurements beside them in
`measured-land-<era>-1024x580.txt`. They come from
`apps/web/src/city/three/beatTwoGrowsTheIsland.browser.test.tsx`, which runs in CI, mounts the
shipped `CityScene` **under reduced motion behind a stability gate**, and carries no HUD — so
they are the land on its own, at two budgets, where the frames above are the composition at
one. The two sets answer different questions and neither substitutes for the other.

| file | what it shows |
| --- | --- |
| `land-prehistoric-before/grown-*.png` | Era one's advance: the drawn grass walks 30 → 38, an 8-unit step, and the recovered ring radius goes 32.5 → 40.3. |
| `land-neolithic-before/grown-*.png` | Era two's: 38 → 43, a 5-unit step, 40.3 → 45.6. Its BEFORE frame recovers the same 40.3 era one's AFTER frame does, which is the hand-off measured — the growing apron at grass 38 and the rebuilt island at grass 38 draw the same silhouette. |

⚑ **These four frames were re-taken on 2026-08-04** and the ring radii above are the new ones.
`islandDressingRadius` (`city/islandLand.ts`) now reaches the land in the beat that opens it,
so the island itself is drawn out to the new radius the moment beat two completes rather than
the apron standing in for it until the hand-off — and the island's vegetation, its shore
scatter and its camp go with it instead of staying at the old shoreline
(`docs/design-refs/island-dressing-reaches-the-shore/`). **The measurement this file is about
barely moves**, which is the point: the recovered radius is 40.3 either way at era one's
advance, because the apron's shore reach was already matched to the island's. What moves is
how much of the frame the beat changes, 74.89% → 76.52% at era one and 70.08% → 74.07% at era
two, and 45.2 → 45.6 at era two's, where the rebuilt island's own boulder scatter reaches a
little further out than the apron's bare edge did.

## ⚑ WHY THE NAIVE COMPARISON IS WRONG, and it will be reintroduced otherwise

**Do not diff the composite frames against each other.** The obvious version of the per-beat
measurement — take the five composites and count what changed — is confounded, and by a
large margin.

The bubble is sized to what the advisor is saying and to the answer control under it, and
both differ per beat: a question carrying a notation keypad and a `PREVIEW` row is a much
taller bubble than one carrying neither. Measured on the frames in this directory, the
bubble's top edge sits at

- **1024x580:** 380, 376, 272, 358, 424 — a **152px** spread;
- **1440x900:** 662, 547, 688, 635, 728 — a **181px** spread,

and it moves in both directions between consecutive states. Every pixel it uncovers is
island that was always there, and every pixel it covers is island that did not go anywhere.
On a 580px-tall frame that is a quarter of the screen's height changing hands for reasons
that have nothing to do with the era advance. (The current run's own spread is written into
`measured-1024x580.txt` beside the frames; the numbers above are the ones the argument was
first made on and are kept as the worked example.)

**Which state gets the tall bubble is not even stable between runs.** The ceremony draws its
question from the interleaved bag through `Math.random`, which this suite does not pin, so a
re-shoot serves different items and the tall bubble lands on a different beat: the same five
states came back as `272, 380, 380, 358, 424` on one run and `380, 376, 272, 358, 424` on the
next. A measurement clipped around the bubble would therefore report different per-beat
numbers on two runs of identical code, which is the strongest form of the argument for
hiding the advisor rather than clipping.

**Clipping the diff to the band above the shortest bubble is not a fix either**, and that is
worth saying because it is the first thing anybody tries. It is what the first version of
this measurement did: it happened to be sound at 1024x580, where the band ended at row 280
and the earliest bubble began at row 282, but it was sound **by two pixels nobody chose**, it
was never checked at the other viewport, and the next line of copy anybody writes moves the
edge it depends on.

So the advisor is hidden and re-captured instead, which leaves nothing over the island at
all and lets the whole frame be compared rather than a band of it. A hidden overlay is also
the arrangement that photographs the WebGL canvas live rather than stale, which
`winterIslandVisible` measured and `crisisAdvisorOverIsland` already relies on.

### The per-beat figures carry a few tenths of a point of run-to-run noise

Read them as *"about four percent"* rather than as *"4.73 percent"*. The island's birds are
animated on the render clock, so two captures of the same state differ slightly by where the
birds are, and the settle before each capture is a timer rather than a frame count. Measured
by re-shooting the identical tree either side of a merge that touched none of it: 4.08 →
4.73, 1.38 → 1.57, 3.14 → 2.95, 55.45 → 55.78 at 1024x580, moving in both directions. The
floor the guard asserts is 0.1% of the frame, which is an order of magnitude under the
smallest of them, so the noise cannot flip a pass into a failure.

⚑ **That last sentence is now load-bearing in a way it was not written to be.** Beat four's
figure at era one → two is **1.23%**, which is close enough to the 0.1% floor that the guard
would still pass over an island whose fourth beat had stopped doing anything visible at all.
The guard is doing what it was written to do — the beat really does change the island — but it
is no longer a proxy for *"the age visibly turns"*, and that is a content gap rather than a
guard to tighten.

## Regenerating them

```
VITE_ERA_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/eraAdvanceOnTheIsland.browser.test.tsx
```

which writes straight back into this directory. It is gated off by default because a full
shadow-mapped scene with seven GLBs is heavy, and a heavy scene left on in that suite
starves an animation-timing assertion in a different file rather than failing in this one.
