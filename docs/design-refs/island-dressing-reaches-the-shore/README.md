# The island's plants reach the island's shore

The rendered evidence behind the 2026-08-04 change that stopped the island's decoration
standing at era one's shoreline on every island bigger than era one's.

The lead, reviewing era one mid-ceremony:

> the actual island features like the plants and stuff dont adjust when the island moves; not
> sure if we have any actual island designs in place but this seems like a pretty glaring issue

and, on the frame: **a ring of rocks, bushes and scattered props at one radius with bare green
beyond it, out to the actual shoreline.**

## Why these are committed, when `__screenshots__/` is gitignored

`.gitignore` excludes `**/__screenshots__/` because what lands there is regenerated on every
run and is meaningless afterwards. These are kept for the opposite reason. The claim is
spatial — *"is there bare ground between the last bush and the beach"* — and
`.cursor/rules/qa-verification.mdc` is explicit that a passing layout test cannot settle one:
*"a spatial claim owes a rendered frame that someone LOOKED at."* The measurements live in
`apps/web/src/city/three/islandDressingFillsTheIsland.test.ts`; these are the pictures they
are about.

**The viewport is in every filename, and 1024x580 is the lead's own window.** Every frame is
the whole island rather than a crop of the margin that changed: cropped to the band, a
screenshot proves nothing about the ground beyond it, and the ground beyond it was the
complaint.

Every frame is the shipped `CityScene` — its own `Canvas`, its own `CityFrame`, its own
`StarterIsland` and `NewGround` — under **reduced motion**, with a two-identical-captures
stability gate. Composed exactly as `CitySurface` composes it: the standing era's layout, the
island's own era, and the ceremony's land radius beside the layout rather than inside it.

## Regenerating them

    VITE_ISLAND_DRESSING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
      apps/web/src/city/three/islandDressingReachesTheShore.browser.test.tsx

That rewrites the five `after` frames and their `output/` copies.

⚑ **SINCE 2026-08-04 IT NO LONGER REPRODUCES THESE FILES, AND THAT IS DELIBERATE.** Every frame
here carries the island's baked cell grid, because that grid was drawn always. It is now gated on
`placing || roadPainting` (`StarterIsland`'s `buildGrid`, and
`docs/design-refs/island-reads-as-a-place/` for the measurement and the frames), and none of these
moments has a placement in progress — so a regeneration today gives the same islands with no grid
on them. They are kept as they were on purpose: their value is that they are a before/after PAIR
in which exactly one thing differs, and re-taking one half would spend that. Nothing this file
claims — do the plants reach the shore — is about the grid. **The `before-*.png` frames
are NOT regenerable from this tree** — they were taken by running the same file in a worktree
at `765df7a8`, `integration`'s tip immediately before the change, and copied in by hand. They
are the evidence the defect existed.

⚑ **That baseline already contains #521**, which merged an hour before this work started and
fixes the same shape one layer down. Its `islandDressingRadius` moved the island's dressing
onto the grown land at BEAT FOUR, and it sized era two's worked plots from era two's own ring —
so the `before-` frames already show era two's fields filling the band and beat four drawn at
grass 38. What they still show, and what this change is about, is the TERRAIN decoration: the
trees, the scrub, the boulder clusters, the worn earth and the whole camp, still standing in a
hoop at radius 26 with bare ground between them and the beach.

## What each one is

| file | what it shows |
| --- | --- |
| `resting-prehistoric-*.png` | **The control.** Era one at rest, grass 30. Its decoration band is 2.8 units wide and every radial offset in `StarterIsland.tsx` was authored against it, so this island had nothing wrong with it and must not have moved. Before and after are the same picture, and `islandDressingFillsTheIsland.test.ts` pins the digest of all 545 mesh positions to prove it. |
| `resting-neolithic-*.png` | Era two at rest, grass 38 — a **10.8-unit** ring. Before: #521's worked plots do reach out across the band, and between them the trees, scrub, worn earth and the whole camp sit in a hoop at radius 26 with ten units of empty green running out to the beach. After: the margin is vegetated to the shore between the fields as well as under them. |
| `resting-bronze_age-*.png` | Era three at rest, grass 43, and the **naked case** — era three has no authored ground, so there are no fields and no camp to carry the band and nothing but terrain decoration to look at. Before: about fifteen bushes on a fifteen-unit band. This is what "reads as sparse" looks like, and it is what eras four to ten look like too, on a band wider still. |
| `ceremony-prehistoric-beat-2-land-grown-*.png` | ⚑ **The lead's own frame, and the one #521 does not reach.** Beat two of era one's advance, land walked out to 38 while era one is still standing. Before: era one's dressing at its old 27.8 shoreline with the surveyed apron bare all the way to the new beach — a ring of rocks, bushes and scattered props at one radius with bare green beyond it. After: the island is drawn at the radius the beat opened and its dressing goes with it, survey line still pegged across it. |
| `ceremony-prehistoric-beat-4-island-rethemed-*.png` | Beat four, the retheme. #521 already put era two's GROUND and FIELDS out on the grown land here, which is why the before frame is a full-size island; what it still shows is era one's vegetation hoop underneath them. After: the terrain decoration reaches the shore too. |

## The two defects, and why neither fix works alone

`marginRing`'s docblock in `StarterIsland.tsx` and `islandDressingRadius`'s in
`islandLand.ts` carry the full reasoning. In one line each:

1. **The offsets and the counts were era one's.** A ring 2.8 units wide became 10.8 and then
   18.8, but `marginIn + 1.2` and `COPSES = 5` did not. Pushing the ring out without the
   counts trades a ring at the wrong radius for a ring at the right one; scaling the counts
   without the ring crowds more copses onto era one's contour.
2. **The dressing was laid on the land the LAYOUT drew, and the land moves two beats before
   the layout does.** `CitySurface` keys the layout on the standing era and moves it once, at
   the hand-off; beat two walks the shoreline out. #521 closed the second half of that window
   by keying the dressing radius on `islandEra`, which swaps at beat four — a beat and a half
   after the land moves, which is why beat two still photographed the defect. It is keyed on
   the survey now, so it reaches the land in the beat that opens it, latched at the beat's end
   because the island cannot be rebuilt once per answer.

## Measured

Off the built scene graph, at `765df7a8` and again after. **Reach** is the outer half of the
band's decoration density over the inner half's, split at equal area. **Density kept** is the
same dressing on its own island against that dressing on era one's ring. Both exclude era two's
worked ground and its water edge, which are named subtrees and are #521's lane, so these are
about the terrain decoration alone.

| era | band | reach, before → after | density kept, before → after |
| --- | --- | --- | --- |
| prehistoric | 2.8u | 1.759 → 1.759 | 1.000 → 1.000 |
| neolithic | 10.8u | 0.261 → 1.648 | 0.233 → 0.664 |
| bronze_age | 15.8u | 0.553 → 0.747 | 0.153 → 0.868 |
| classical … cyberpunk | 18.8u | 0.583 → 0.711 | 0.125 → 0.886 |

**What that costs.** Holding era one's density over a band up to 8.75 times the area takes
eras four to ten from 345 island nodes to 1433, era two from 1623 to 2248, and the memoised
rebuild with them: ~15ms to ~60ms measured in node, era one unchanged at ~21ms.
`CeremonyLayer.tsx` records the same measurement from the other side and it is why beat two
draws an apron rather than regrowing the island every frame — and why the dressing radius
latches at the beat's end rather than tracking its walk. The rebuild happens at most twice in
a sitting.

## What is still open, named rather than left to be found

**The outer band edge is thinner than era one's, by a gradient rather than a gap.** Era one's
offsets are uniform in RADIUS, so at a wide ring the same distribution is mildly denser inland
per unit of area: the outer half of era four's band carries 0.711 of the inner half's, against
era one's 1.759. Closing that would mean re-sampling era one's approved scatter by area, which
moves the one island nobody complained about. Visible in `resting-bronze_age` as a soft
thinning in the last two or three units before the sand, not as bare ground.

**Era three's ground is still unauthored** and that is not this change's to fix — its island is
the deliberate mid-value grey of `UNAUTHORED_ISLAND_GROUND`, which is why
`resting-bronze_age-*.png` is a grey island with green bushes on it. #521 records the same
finding and names it as Evan's call.
