# Era four's frontage rule, measured against the real geometry

Run `node scripts/measure-era4-frontage.mjs` to reproduce every number below.

## First, the thing that has to be said before the table

**The document this job was to check against is not in the repository, and never has been.**
The brief names
`output/claude-design/era-04-succession/response-v2/Era 04 Succession - Six Scene Assets.dc.html`.
There is no `response-v2/`, no `response/`, and no file of that name anywhere on disk or in
any git ref. `output/claude-design/era-04-succession/` holds the **prompt package** sent to
Claude Design — `START-HERE.md`, `asset-spec.md`, `plates/`, `precedent/`,
`renderer-boundary.md`, `shipped-code/` — and no answer.

Searched, so this is a measurement rather than an impression:

- `find / -iname "*Six Scene*" -o -iname "*.dc.html"` returns seven files, all of them
  building or advisor art sources. None is a Succession sheet.
- `git log --all --name-only -- "output/claude-design/**" | grep -i response` is empty.
- `git grep -l readFrontage` over `git rev-list --all --max-count=200` is empty.

So `readFrontage()` does not exist, and **three of its four assumptions could not be read**.
Only the one the brief quotes was available to check:

> a wall plane containing the principal door must have a half-width of at least `0.5 + BAY`
> (1.05 × BAY)

**`BAY` could not be recovered either**, and the quoted algebra does not close — `0.5 + B =
1.05B` gives `B = 10`, which is not a bay in any unit this renderer uses. The two readings
that fit the shipped numbers are `BAY = 1.15` (`buildCivicBuilding`'s own `bayStep`, the only
bay module that ships) and `BAY = 0.55` (which makes `0.5 + BAY` evaluate to the annotated
`1.05`, and is also the fallback offset the brief quotes).

The measurement is therefore built so it **does not depend on resolving any of that**. It
reports the raw wall available beside each entrance, in world units, and applies every
candidate threshold to it. As it turns out the answer is the same at all of them, so the
missing constant costs nothing — see "the verdict does not hinge on `BAY`" below.

## What is measured, and in what units

**World units as placed, never native model units.** `PlacedBuilding.prepareModel`
contain-fits every model to its plot, so a model's native half-width says nothing about the
wall a plate lands on. The fit scale varies by more than 3× across this era — 0.1378 on the
Barracks to 0.4258 on the Surveyor's Shop — which is itself half the story.

For each authored opening, on its own wall plane, at its own mid-height:

| Quantity | Meaning |
| --- | --- |
| `reach` | How far the wall runs from the entrance's **centre line** before it ends, as one contiguous run. A plate one bay to the side needs `BAY + 0.525` of it. |
| `halfW` | Half the full contiguous wall run through the entrance. |
| `widestWall` | The widest unbroken wall **anywhere** on that plane — the threshold-free question, "is there anywhere on this face a 1.05-wide plate could be fixed". |

`0.525` is half the claim plate's slab, which is `box(1.05, 0.78, 0.12)` in
`buildClaimPlate`.

## How the doors were found, and why the result can be trusted

The GLBs export unnamed meshes (`mesh_0`, `mesh_1`, …), so no door can be found by name in a
shipped file. Instead each building is **rebuilt from the same procedural kit the exporter
uses**, with `plankDoor`, `doorway`, `archHole` and `arcade` wrapped to record every call.
All four builders lay their geometry toward local **+Z**, so an opening's outward normal is
its group's local +Z axis, read off the world matrix rather than inferred from a bounding box.

**The rebuild is proved to be the shipped building.** Every run parses the committed GLB and
compares a full mesh census — count, plus every mesh's world-space size and centre, sorted —
against the rebuild. All ten match, at 672 / 838 / 170 / 152 / 126 / 331 / 539 / 250 / 125 /
809 meshes. This matters more than it looks: the kit draws from `Math.random()` for its
textures as well as its props, so the exporter's seeded stream had to be reproduced exactly,
and a census mismatch would void every door position taken from the rebuild.

**And the probe was checked by hand against the kit source.** The Surveyor's Shop is the
simplest case: `W = 12`, one `doorway(1.9, 3.6, wt, x = -1.6, …)` on a wall spanning
`x ∈ [-6, 6]`, fitted at 0.4258. Predicted reach `(6 − −1.6) × 0.4258 = 3.236`; measured
**3.22**, one probe step. Predicted half-width `6 × 0.4258 = 2.555`; measured **2.54**.
Predicted door width `1.9 × 0.4258 = 0.809`; measured **0.81**.

**One real defect was found and fixed this way, and it moved a verdict.** The first pass
counted anything within 0.85 world units of the door plane as wall, which is a reasonable
figure for a full-size model and a wrong one for a fitted one: at the Cottages' 0.1707 fit,
0.85 world is 5.0 native, so the building's stone stair — standing 1.8 to 3.4 native units
proud of the shop fronts — read as wall. It inflated the Cottages' left reach from 0.62 to
1.12 and turned a fail into a pass. The band is now ±0.20 world, a shade under twice the
plate's own 0.12 bedding depth.

`band-sensitivity.txt` re-runs the whole table at ±0.10, ±0.12, ±0.20, ±0.30 and ±0.45.
Eight of the ten buildings return the same verdict at every band. The two that move are named
in the table below rather than smoothed over.

## The table

Reach is the worst door on each building, because the rule has to hold for whichever door
`readFrontage()` picks, not the most flattering one. Full output in `measurement-run.txt`.

| Building | Plot | Fit | Entrance | Doors | Worst reach | BAY 0.55 | BAY 0.80 | BAY 1.15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Cottages | 1×2 | 0.1707 | door | 10 | 1.06 | **FAILS** | **FAILS** | **FAILS** |
| The Baths | 3×2 | 0.2077 | door | 1 | 1.86 | holds | holds | holds |
| The Fountain | 1×1 | 0.1688 | **none** | 0 | 0.12 | **FAILS** | **FAILS** | **FAILS** |
| The Grain Dock | 2×2 | 0.1557 | door | 4 | 2.88 | holds | holds | holds |
| POL.1 Stonecutter's Shop | 2×2 | 0.2984 | door | 1 | 2.28 | holds | holds | holds |
| POL.2 Barracks | 2×1 | 0.1378 | door | 7 | 0.88 | **FAILS** | **FAILS** | **FAILS** |
| POL.3 Customs House | 2×2 | 0.1730 | **none** | 0 | 0.94 | **FAILS** | **FAILS** | **FAILS** |
| POL.4 Wine Cellars | 2×1 | 0.1699 | **none** | 0 | 2.26 | holds\* | holds\* | holds\* |
| POL.8 Surveyor's Shop | 2×2 | 0.4258 | door | 1 | 3.22 | holds | holds | holds |
| Senate House (hub) | 3×2 | 0.1841 | door | 3 | 3.22 | holds | holds | holds |

\* POL.4's is the one band-sensitive row: its opening is an arcade, and at ±0.10 and ±0.12
the pier relief falls outside the band and the measurement collapses to 0.00. Read its
"holds" as conditional on the arcade pier counting as wall. The Cottages is the other mover
— at ±0.30 and ±0.45 its worst reach rises to 1.12 and it passes at BAY 0.55 only. It fails
at BAY 0.80 and BAY 1.15 at **every** band.

### The verdict does not hinge on `BAY`

Four buildings fail at every candidate `BAY`, and one more fails at all but the loosest. The
missing constant would change no row. **The rule does not hold, and it is not close.**

## Three findings, in the order they matter

### 1. Three of the ten buildings have no door at all

The Fountain, the Customs House and the Wine Cellars contain **zero** `doorway` and
`plankDoor` calls. Their openings are round arches (`archHole`) and open arcades. This is not
an artefact of the instrumentation — it is visible in the kit source, where `fountain` and
`cellars` call only `arcade`, and `customs` calls only `archHole`.

`readFrontage()`'s precondition is *"a wall plane containing the principal door"*. On three of
the nine buildings a plate could land on, **there is no principal door for it to find**, and
the rule has no defined behaviour rather than a tight one. The Fountain is the sharpest case
and is arguably not a failure at all: it is an aqueduct spur and a basin, and a claim plate on
it may simply be wrong. The Customs House and the Wine Cellars are real civic masses whose
front is an arcade, and they need an answer.

### 2. The failure the sheet predicted is real, but not for the reason it gave

The sheet singled out **a narrow cottage frontage**, and the Cottages does fail. But the
mechanism is different. The Cottages is not one narrow front: it is an **L-plan of two wings
with ten openings on four different planes**, seven of them shop doors at street level and
three gallery doors on an upper timber landing. Its widest door is 0.39 world units; its worst
door has 1.06 of reach and its best 1.48. There is no principal door in the sense the rule
means, and picking one changes the answer by 40%.

What makes it narrow is the **plot**, not the drawing: a 1×2 footprint binds on the 1-cell
axis, so the whole building is fitted into 3.80 world units of width whatever it measured
natively.

### 3. The plate has an absolute size and the buildings have a fitted one — this is the real problem

This was not on the sheet's list and it subsumes the assumption that was.

| Building | Fit | Frontage | Entrance width | Plate ÷ frontage | Plate ÷ entrance |
| --- | --- | --- | --- | --- | --- |
| The Cottages | 0.1707 | 4.45 | 0.39 | 0.24× | **2.67×** |
| The Baths | 0.2077 | 7.60 | 0.75 | 0.14× | 1.40× |
| The Fountain | 0.1688 | 3.80 | 0.61 | 0.28× | 1.73× |
| The Grain Dock | 0.1557 | 7.60 | 0.50 | 0.14× | 2.11× |
| POL.1 Stonecutter's Shop | 0.2984 | 7.60 | 0.57 | 0.14× | 1.85× |
| POL.2 Barracks | 0.1378 | 4.99 | 0.26 | 0.21× | **4.01×** |
| POL.3 Customs House | 0.1730 | 7.60 | 0.73 | 0.14× | 1.44× |
| POL.4 Wine Cellars | 0.1699 | 6.37 | 0.58 | 0.16× | 1.82× |
| POL.8 Surveyor's Shop | 0.4258 | 7.60 | 0.81 | 0.14× | 1.30× |
| Senate House (hub) | 0.1841 | 7.60 | 1.03 | 0.14× | 1.02× |

**The 1.05-wide plate is wider than the entrance it is meant to sit beside on all ten
buildings.** The best case is the Senate House at 1.02×, where plate and door are the same
width. The worst is the Barracks at 4.01×, where the plate is four times the width of the door
and a fifth of the whole building's frontage.

That is a different failure from the one the rule was written to catch. A frontage rule
decides *where along a wall* a plate goes; it cannot help when the object being placed is
larger than the feature it is being placed beside. The plate is authored in the forum's own
frame, where `buildCivicBuilding` draws a 5.75-wide civic building and a 1.05 plate is 18% of
it — and on a real fitted building that same 1.05 is 14% to 28% of the whole frontage.

### And this one is spatial, so it owes a frame

`07-plate-against-real-buildings-1024x580.png`, taken at **1024x580** by
`apps/web/src/city/three/era4PlateFitShots.browser.test.tsx`. The four claimable civic
buildings, each drawn through `PlacedBuilding` so it carries the same contain-fit the city gives
it, each with the shipped `buildClaimPlate` at its shipped size standing at its frontage —
nothing rescaled on either side, nothing cropped. The frame's own guard requires four plates and
over 1500 meshes in the live scene, because `PlacedBuilding` fails closed to a one-box procedural
shell and a frame of four fallbacks would look like a perfectly good frame of four buildings.

**What it shows.** Left to right: the Grain Dock, the Cottages, the Baths, the Fountain. On the
Baths — the largest of the four at a 3×2 plot — the plate is a proportionate object, and it is
the only one of the four where that is true. On the Cottages the plate is as wide as a whole
shopfront. On the Fountain it is a slab standing beside a low basin and reads as a monument in
its own right rather than as a mark on a building. The measured ratios are 1.40×, 2.67× and
1.73× of the entrance width respectively, and the frame is what those numbers look like.

**Where the plate SITS is deliberately not what this frame argues**, because that is the question
`readFrontage()` exists to answer and the missing sheet was to have settled. The plate is put in
the middle of each building's own frontage, which is plainly fair to the rule. What the frame is
evidence for is the prior question of size, which no placement rule can help with.

## So: is the sheet's fallback sufficient?

**No.** The fallback is *"same bay as the door, offset 0.55"*, which moves the plate closer to
the door instead of a full bay away. Measured against the same reach column, it rescues
nothing that matters:

- It does not help the three buildings with **no door**, because it still starts from one.
- It does not help the **Barracks**, whose worst reach of 0.88 is below the 1.075 that even
  the fallback needs.
- It rescues the **Cottages** only at the loosest band, and it does so by putting a plate 2.67×
  the width of the door 0.55 away from its centre — which is to say, overlapping it.

The fallback is a smaller offset for the same object. Every failure above is about the object's
**size** or about there being **no door**, and neither is an offset's to fix.

## What I would change, and it is the lead's call

1. **Scale the plate to the building it lands on** rather than shipping it at an absolute
   1.05. The building already has a fit scale; deriving the plate's width from the entrance
   it sits beside (or from the frontage span) would make one rule work on all ten, and would
   retire the half-width assumption entirely rather than verifying it.
2. **Define the entrance for an arcaded front.** Three buildings need it and the geometry
   offers an answer: an arcade's pier is a real, flat, plate-width piece of wall.
3. **Keep the frontage test, but as a fallback rather than the primary.** With a plate sized
   to its building, `widestWall` says every one of the ten has somewhere to put it — the
   column is 1.64 to 6.44 world units and the plate needs 1.05.

## Files

| File | What it is |
| --- | --- |
| `../../../scripts/measure-era4-frontage.mjs` | The measurement, re-runnable |
| `measurement-run.txt` | Full output of the default run, all four tables |
| `band-sensitivity.txt` | The same verdicts at five wall-band values |
| `frontage-measurements.json` | Every opening on every building, machine-readable |
