# Does the island read as a place, or as a plane?

> ## ⚑ 2026-08-05 — THE GRID GATE WAS REVERSED BY THE LEAD. READ THIS FIRST.
>
> Everything below argues for hiding the placement grid outside placement, and
> #566 shipped that at
> `2026-08-05T02:56:18Z`. The lead, having loaded the game on it:
>
> > dude wtf - where did the grid/tiles go?? they need to still be in the game - revert whatever
> > PR you did that took them away
>
> So the grid is **drawn always** again, and `apps/web/src/city/three/placementGrid.test.ts` now
> pins it visible at every era rather than pinning it off. The `after-*` frames in this directory
> are the **retired** state. The `restored-*` frames are what ships.
>
> **What survives from #566 unchanged, because it was measurement rather than opinion:** the
> `islandBareInterior.test.ts` numbers below, and the reading that the empty middle is not a
> dressing defect. The middle really is ~80% of the island's area after #544 and the grid really
> is drawn over all of it. The ruling is only that **the tiles are not what pays for that** — the
> ground-flat decoration option costed in *"What needs an art ruling"* below is still the open
> item, and still needs Evan.
>
> `restored-*` frames were shot on the same committed harness, at the same 1024x580, with
> `VITE_ISLAND_PLACE_TAG=restored-`. Five of the six comparable ones are **byte-identical** to
> this directory's own `before-*` frames, which is the mechanical proof that the revert is exact:
>
> ```
> md5sum restored-neolithic-cold-open-1024x580.png before-neolithic-cold-open-1024x580.png
> ```
>
> `grid-restored-game-surface-idle-1024x580.png` is the extra one the lead's wording earned — he
> said he *loaded the game*, so it is `<CitySurface enableCanvas />`, the element `App.tsx` mounts
> for a learner, with its whole HUD, idle, at 1024x580. Not `?dev`. The grid fades out before the
> shore by design (`buildGrid`'s radial fade), so the cells read on the buildable disc and not on
> the sand; to see them at a glance:
>
> ```
> ffmpeg -i grid-restored-game-surface-idle-1024x580.png \
>   -vf "crop=360:240:330:280,scale=1080:720:flags=neighbor" zoom.png
> ```

The rendered evidence behind the 2026-08-04 change that stopped the placement grid being drawn
over ground nobody is placing anything on — the measurement that says the empty middle underneath
it is not a dressing defect — and the measurement that says
#544, which merged while this was
being written, has made the empty middle **two and a half times bigger** on the demo path.

The product lead, after advancing an era and watching the island expand:

> the graphics also are cooked after the age advances / the island expands; this needs to be
> fixed. not sure if theres behavior for this already

## The frame the complaint is about, identified rather than guessed

**Era two (neolithic), cold open.** `pre544-neolithic-cold-open-1024x580.png` is the lead's own
screenshot in every particular: a green octagonal island, one Civic Center dead centre, a
placement grid over plain green, and every tree, boulder, earth patch and scrub clump out in a
ring at the rim.

## Which of the two readings it is: the second, measured

Two things could produce that frame and they want opposite fixes.

1. **The dressing pass is failing to fill the expanded interior**, leaving a bare annulus where
   decoration should be.
2. **The interior was never dressed at any era**, so nothing is broken and what the lead is
   reacting to is the emptiness plus the grid.

`apps/web/src/city/three/islandBareInterior.test.ts` measures it off the built scene graph. **It
is the second.** At `5f470d62`, the tip the complaint was raised against:

| era | grass | disc | decoration floor | first decoration stands at | undressed centre, as a share of the island's area |
| --- | --- | --- | --- | --- | --- |
| prehistoric | 30 | 22 | 25.0 | 25.35 | **71.4%** |
| neolithic | 38 | 22 | 25.0 | 25.35 | 44.5% |
| bronze_age | 43 | 22 | 25.0 | 25.25 | 34.5% |
| classical … cyberpunk | 46 | 22 | 25.0 | 25.21 | **30.0%** |

Read the first row against the last, because that pair is the answer. The undressed disc was an
**absolute 25 units at every era** — the walkable annulus, which
`islandDressingFillsTheIsland.test.ts` already holds as a veto because a tree standing in a cell
a building may occupy is a collision. So as the island grew, the undressed part became a
**smaller** share of it, 71.4% of era one's island down to 30.0% of era four's. A dressing pass
failing to fill new ground would move that number the other way.

And the dressing starts **at** its floor — 0.21 to 0.35 units past it — with no empty 2-unit
annulus anywhere between there and the shore, at any of the ten eras. There is no bare annulus.
There is one bare disc, it is the ground buildings stand on, and it predates the era system.

## So what was wrong: a placement affordance with no placement

There are **two** cell grids and only one of them was gated.

- `CityScene`'s `BuildGrid` — the bright drei `<Grid>` with the warm accent every third cell —
  has been mounted on `placing || roadPainting` since it was written.
- `StarterIsland`'s `buildGrid` — the subtle baked one underneath it — was drawn **always**.

Both are now the same value, computed once by `islandShowsItsCells` and handed to both, so they
are one affordance in two strengths rather than two conditions that agree today.

**It also un-draws a grid two callers already said they did not have.** `TitleBackdrop`'s docblock
has read *"NO buildings, NO grid, and NO camera controls the user can grab"* since `1af0a5f8`
(2026-07-24) — three days after `7275cc26` baked the grid into the island group — so the start
menu has been showing a build grid behind it for as long as there has been a start menu.

## ⚑ AND THEN #544 MERGED, at `1bca837a`, and the middle got much bigger

#544 grows the buildable disc to follow the drawn land, which is the right fix for the defect it
was written against. The decoration band runs from the disc's walkable annulus **outward**, so a
wider disc narrows the band to era one's 2.8 units at every era instead of letting it widen to
18.8. Re-measured on the merged trunk rather than predicted:

| era | undressed centre, `5f470d62` → `1bca837a` | decoration band |
| --- | --- | --- |
| prehistoric | 71.4% → 71.4% (its disc does not move) | 2.8u → 2.8u |
| neolithic | 44.5% → **76.2%** | 10.8u → 2.8u |
| bronze_age | 34.5% → **78.6%** | 15.8u → 2.8u |
| classical … cyberpunk | 30.0% → **80.7%** | 18.8u → 2.8u |

**Its counter-argument is that the interior fills with the player's own buildings, and that is
half true.** Measured through the same shipped `ringLayout` on each tree's own disc:

| era | seated, `5f470d62` → `1bca837a` | city's outer reach | ground carrying neither a building nor decoration |
| --- | --- | --- | --- |
| neolithic | 11 of 11 → 11 of 11 | 20.6u (54% of the radius), unchanged | 13.9% → **46.1%** of the island |
| renaissance — the demo's own age | 19 of 32 → **32 of 32** | 20.6u (45%) → **31.6u (69%)** | 9.5% → **32.2%** |
| cyberpunk | 19 of 62 → 50 of 62 | 20.6u (45%) → 36.8u (80%) | 9.5% → 15.5% |

So #544 really does seat far more buildings and they really do reach further, and by the last
row it has nearly paid for itself. What it has not paid for is the two states that matter this
week: **the cold open, which is `citySession`'s own pre-seeded state and the lead's screenshot,
and era six, which is the demo's age.**

## The frames

**Every filename carries its viewport, and 1024x580 is the lead's own window.** Every frame is
the whole island, because a crop of the middle proves nothing about the ground around it. Every
frame is the shipped `CityScene` — its own `Canvas`, its own `CityFrame`, its own
`StarterIsland` — under reduced motion, with a two-identical-captures stability gate, composed
exactly as `CitySurface` composes it.

    VITE_ISLAND_PLACE_SHOTS=1 VITE_ISLAND_PLACE_TAG=after- npx vitest run \
      --config vitest.browser.config.ts \
      apps/web/src/city/three/islandReadsAsAPlace.browser.test.tsx

### Four trees

| prefix | tree | what it is |
| --- | --- | --- |
| `pre544-` | `5f470d62` | trunk when the complaint was raised. **Not regenerable from this tree.** |
| `pre544-gated-` | `5f470d62` + this change | what gating the grid does on its own. Not regenerable either. |
| `before-` | `1bca837a` | **trunk today**, with #544 in it. |
| `after-` | `1bca837a` + this change | what this pull request ships. |

### Three eras, and why these three

**Era one** is the control: shipped, approved art, the island nobody complained about. **Era two**
is the first grown island and the one the lead photographed. **Era six (renaissance)** is the
demo's own age — `eraPlacementFromSeed` hands a learner placed there five ages, so they walk into
era six — it sits at the growth ceiling of grass 46, and it has no authored ground props, so it
is both the demo path and the naked case.

### Two cities, and why an empty one is not a strawman

`citySession` pre-seeds the Civic Center and clears everything else, so **cold open is the state
a learner is actually in** after a diagnostic, and it is the state in the lead's screenshot. The
full roster is the whole cumulative skill graph through that era, seated by the shipped
`ringLayout` on whatever disc the era's layout reports — 19 of 32 at era six before #544, 32 of
32 after it.

### The honest read of each

| file | what I see |
| --- | --- |
| `pre544-neolithic-cold-open` | **The lead's frame.** The grid has shrunk to a mandala in the middle of a much bigger island; between its edge and the tree ring is a wide belt of undifferentiated green. This is what "cooked" means. |
| `pre544-gated-neolithic-cold-open` | The same island with the grid gated: a green meadow with a deep wooded rim and a hut in it. Still empty in the middle — nothing here fills it — but empty and pastoral is a different picture from empty and parcelled. On that tree, the grid was most of the complaint. |
| `before-neolithic-cold-open` | **Trunk today.** The band has collapsed to a necklace against the beach and the grid now covers nearly the whole island. Worse than the frame the lead complained about. |
| `after-neolithic-cold-open` | The grid goes; what is left is a flat green disc with one hut and a rim of bushes. Better than `before-`, and still a plane rather than a place. The gate cannot fix this one on its own. |
| `before-renaissance-cold-open` | The demo's age at cold open: a grey car park with cell lines over it. |
| `after-renaissance-cold-open` | The same without the lines. Honest read: this is the frame that most needs the ground ruling below, and the grey on top of it is Evan's `UNAUTHORED_ISLAND_GROUND`, not this change's. |
| `after-renaissance-full-roster` | The demo's own frame. Thirty-two buildings, well spread, and then a nine-unit grey annulus out to a thin line of bushes — **32% of the island** where nothing may stand. The city looks good; the island around it does not. |
| `pre544-gated-renaissance-full-roster` | The same city on the pre-#544 tree: nineteen buildings in a clearing inside a belt of woodland. Fewer buildings, and to my eye the better picture, because the island is carrying the frame. This pair is the trade #544 made, and which side of it is right is the lead's call, not mine. |
| `after-prehistoric-cold-open` | Era one loses its grid too, and this is the frame worth a second opinion. It is prettier — an island rather than a plot — and it loses a genre cue that era one, being small, carried well. The gate is uniform on purpose; if the lead wants era one's grid back it is one condition, not a redesign. |
| `after-*-placing` | **The other half of the grid claim.** Hiding an affordance outside its mode is only defensible if it is there inside it, so the cold-open island is photographed again with a plot being sited: both grids draw, the warm accent lines are back, and the green ghost footprint sits where the pointer put it. Same city, same camera, one flag apart. |

## The injection ledger

Per `.cursor/rules/qa-verification.mdc`: every assertion added here was observed red before it
was trusted. Each injection was applied alone and reverted before the next. Taken at `5f470d62`
and the guards re-run green at `1bca837a` after the forward merge.

### `three/placementGrid.test.ts` — 15 injections, 15 red

| # | injected defect | red at |
| --- | --- | --- |
| 1 | the grid is handed over `visible` | *prehistoric hands the grid over visible* |
| 2 | the grid is handed over at full opacity | *expected 0.72 to be +0* |
| 3 | the grid mesh loses its name | *prehistoric draws 0 cell grids* |
| 4 | a second grid is added to the island | *prehistoric draws 2 cell grids*; *expected 546 to be 545* |
| 5 | the fade becomes a per-frame lerp | *expected 2 to be 1* (the four frame rates disagree) + 2 more |
| 6 | reduced motion fades instead of snapping | *expected 0.004 to be 0.72* |
| 7 | a negative delta is not clamped | *expected 20.4 to be 0.4* |
| 8 | the fade overshoots its target | *expected 0.666… to be 0.72*; *expected 240.4 to be 0.72* |
| 9 | road painting stops showing the cells | *expected false to be true* |
| 10 | `BuildGrid` keeps its own copy of the condition | *to contain '{showsItsCells && <BuildGrid'* |
| 11 | the island stops being told when to show cells | *CityScene.tsx mounts the island without saying when it shows cells* |
| 12a | the title backdrop adopts the flag, written **bare** | *TitleBackdrop.tsx is a declared exception but now shows the cells* |
| 12b | the title backdrop adopts the flag, written with a value | same |
| 12c | the flag reader stops seeing the bare form | *expected false to be true* |
| 13 | a declared exception is renamed | *TitleBackdropRetired.tsx no longer draws an island* + the required half |

⚑ **12a was GREEN on the first pass and that is why it is three rows.** The exception half read
`\bplacing=`, and a JSX boolean flag needs no `=`: `<StarterIsland … placing />` — the shorthand
somebody adding it in a hurry would reach for — sailed straight through the guard written to
catch exactly that. The reader now matches on what may follow the attribute, 12c injects the old
reader back, and `reads a JSX flag written either way` asserts both spellings.

### `three/islandBareInterior.test.ts` — 6 injections, 5 red and one deliberate green

| # | injected defect | red at |
| --- | --- | --- |
| A | reading 1's own defect: the dressing inset to 40% of its band | *neolithic: the island's first decoration stands at 29.46 on a floor of 25.0, leaving 60.1% of the island undressed*; *nothing stands between 25.0 and 27.0* |
| B | a smaller inset, 15% of the band | *first decoration at 26.91*; *nothing stands between 25.0 and 27.0* on era three |
| C | the counts stop being scaled to the band | *bronze_age: first decoration at 26.24 … 37.2% undressed* |
| D | the tussock reverts to era one's 2.55-unit span | **still green, correctly** — see below |
| E | the island stops growing | *expected 1 to be greater than or equal to 4* (distinct islands) |
| F | the band collapses so the sweep walks nothing | *expected 0 to be greater than or equal to 10* (the floor under the sweep) |

**D is a green worth reading.** Every family except the coarse tussock is placed through `bandAt`,
at a fraction of the band; the tussock is the one scattered uniformly across the whole of it. Take
the tussock back to era one's 2.55 units and the other families still cover every annulus — the
band really is still covered, so the guard is right to pass. What reds it is a defect at the
FLOOR both derive from, which is A and B, and which is reading 1 of the complaint. The guard's
own docblock says this so the next reader does not aim an injection at `bandAt` and conclude the
assertion is asleep.

## What this change does NOT fix, named rather than left to be found

### 1. The middle is still empty, and after #544 that is the top open item

This is an **art ruling and it is Evan's**, so here is the costed proposal rather than a look
invented in the code lane.

The decoration floor is the walkable annulus because *"nothing decorative reaches a cell a
building could stand on"* — a tree in a buildable cell is a collision. That reasoning binds on
things with **height**. `StarterIsland` says so itself, in the comment directly above the floor:

> Ground-flat decals are held to the same floor as things with height — **a decal cannot collide
> with anything**, but the floor is a veto and not a guideline, so it holds for the paths and the
> worn earth too.

So the cheapest option is to let the ground-flat families — `earthPatch`'s worn bare earth and
`wornArc`/`wornSpur`'s footpaths — run **inside** the disc while everything with height keeps the
floor it has. That is the era's own authored family at a new radius rather than a new look, and a
building placed over one simply covers it.

What it costs, so the ruling is made with the price attached:

- **it moves era one's island**, and two merged guards pin that island exactly —
  `islandDressingFillsTheIsland.test.ts`'s 545-position digest and #544's
  `eraOneIslandUnchanged.test.ts`, which pins geometry extents too. Scoping the new decals to
  ground the ceremony opened would keep era one bit-identical, but "how much worn ground a
  60%-empty disc should carry" is a density nobody has authored;
- **the seeded RNG stream is order-sensitive.** `buildIslandGroup` warns that a draw inserted
  anywhere re-scatters every later family, which is why its skipped decals are routed to a sink
  rather than skipped. New draws have to be appended at the end of the builder, as the worked
  ground already is;
- **it edits the function #544 has just landed in.**

### 2. Era three's ground is still the unauthored grey

Not this change's to fix. #521 and #537 record the same finding and name it as Evan's call. It is
why every `*-renaissance-*.png` here is a grey island, and it compounds with item 1 rather than
being the same thing.

### 3. #544's cost is reported, not asserted

No assertion added here fails on the merged tree, deliberately. The claim this guard makes is
about the **shape** of the emptiness — one disc, explained by the placement rule, with no hole
beyond it — and #544 keeps that shape while moving the disc. The size of the disc is #544's to
author and the lead's to rule on. A bar drawn here would be one lane vetoing another's landed
change under cover of a measurement.

### 4. Two other directories' committed frames now carry a grid the tree no longer draws

`docs/design-refs/island-dressing-reaches-the-shore/` (#537) and
`docs/design-refs/buildable-disc-follows-the-island/` (#544) both photograph the resting island
through `CityScene` or `StarterIsland` with no placement in progress, so re-running their
harnesses today produces the same islands **without** the cell grid. They are left as they were,
with a note added to each: they are before/after PAIRS whose value is that only one thing differs
between the two halves, and regenerating one half would spend that. Neither pair's claim — do the
plants reach the shore, does the disc follow the land — is about the grid.

---

# Addendum, 2026-08-05: the third ruling — two strengths, and the number

## Read this before any frame above it

This directory now holds **seven trees**, and the two prefixes that read most naturally as
"current" are both retired. Everything above this line answers #566's question and was written
while #566 was trunk.

| prefix | tree | what it is |
| --- | --- | --- |
| `pre544-` | `5f470d62` | trunk when the "cooked" complaint was raised. Grid always on at 0.72. |
| `pre544-gated-` | `5f470d62` + #566 | what gating the grid does on its own. |
| `before-` | `1bca837a` | trunk when #566 was written, with #544 in it. Grid on at 0.72. |
| `after-` | `1bca837a` + #566 | **superseded.** No resting grid at all — the frame the lead rejected. |
| `restored-` | #636's branch | the revert of #566. Grid back, at 0.72. |
| `ground072-` | `47ae7aa1` | **trunk today**, re-shot: #636's state on the merged tree. |
| `ground022-` | `47ae7aa1` + this change | what ships now. |

## The three rulings, in order, because two of them are about the same number

1. **Too strong.** *"the graphics also are cooked after the age advances / the island expands."*
   The grid drew at **0.72** over ground that has never carried decoration, which #544 had just
   taken to 32.2% of era six's island. #566 answered by hiding it outside placement.
2. **Not there at all.** *"where did the grid/tiles go?? they need to still be in the game -
   revert whatever PR you did that took them away."*
   #636 reverted #566 exactly
   (`mergedAt` 2026-08-05T17:05:14Z), which put the grid back — **at 0.72**, the strength ruling 1
   was about.
3. **Two strengths.** Shown that trade rather than either end, the lead ruled for *always visible
   but subtle, and brighter while placing*. That is this change, and it is one number.

**Nothing about #636's architecture is undone here, because the two strengths already existed in
it.** #636 kept `CityScene`'s drei `BuildGrid` on `placing || roadPainting` and said why: *"That
one is the placement affordance and gating it is right. This one is the ground."* So the ground's
strength drops to 0.22 and the gated grid is the brighten. No flag on the island, no `useFrame`
writer, no `getObjectByName`, no exception list — every one of #636's assertions is intact and was
re-injected to prove it (ledger below).

## The number, chosen by looking, in BOTH states at era one AND era six

`grid-strength-sweep-*-crop.png` are the three-up comparisons — **native resolution**, a 480x250
patch of open ground, so line strength is judged at 1:1 pixels. The whole-island `ground022-*` and
`ground072-*` frames beside them are the primary evidence; a crop answers "how strong is the line"
and nothing about the island around it. Every frame is 1024x580 on the learner's own `CityScene`
mount, **not `?dev`**.

Era six is the mandatory one: it is the demo's age and the era where the empty ground is 32.2%, so
it is where a too-strong grid looks worst.

| baked strength | era six idle | era six placing | era one idle |
| --- | --- | --- | --- |
| 0.72 (today) | **fails** — the empty two-thirds of a grey island reads as a car park with its bays marked out. This is the "cooked" frame. | strongest, dense dark cells | a hatched plan rather than a meadow |
| 0.16 | reads correctly — quiet survey grid | **too quiet.** The fine cells a learner needs while siting go faint and the yellow section lines carry the mode alone | correct, on the faint side |
| **0.22** | **ground with a surveyor's grid over it.** Visible, quiet, not a lot | cells still read, sections brighten over them | a plot in a meadow |

⚑ **THE ONE CONSTANT NOW SERVES BOTH STATES, which is what ruled 0.16 out.** Under #566 the
resting and placing strengths were separate numbers, so the resting one could be as quiet as the
idle frame liked. Here the baked grid is the ground under both states, so a value tuned only on
the idle frame takes the placing frame down with it. 0.16 is the better idle number and 0.22 is
the better number.

⚑ **DO NOT SIZE THIS FROM A PIXEL DELTA.** 0.22 against today's 0.72:

| era / state | mean Δ over frame | % pixels changed | mean Δ where changed | max Δ |
| --- | --- | --- | --- | --- |
| prehistoric / cold-open | 0.551 | 11.41% | 4.83 | 13 |
| prehistoric / placing | 0.551 | 11.39% | 4.83 | 23 |
| renaissance / cold-open | 0.571 | 15.76% | 3.63 | 8 |
| renaissance / placing | 0.564 | 15.74% | 3.58 | 27 |

Under half a grey level averaged over the frame, for a change that is the difference between a car
park and a field. Between 0.16 and 0.22 it is smaller still. A coherent lattice over a third of
the screen is legible far below the contrast a difference summary calls visible, which is why
`.cursor/rules/qa-verification.mdc` rules that a spatial claim owes a frame somebody LOOKED at.

## The honest read of each committed frame

| file | what I see |
| --- | --- |
| `ground072-renaissance-cold-open` | **The complaint, on today's trunk.** A 46-unit grey disc with one hut, ruled into cells out to radius 38. It is a car park with a hut in it. This is what a learner walking into the demo's own age sees. |
| `ground022-renaissance-cold-open` | The same island reading as ground again: the lattice is there, quiet, and the eye goes to the hut rather than to the ruling. **This is the frame the change is for.** |
| `ground072-renaissance-placing` | Dense dark cells plus the warm section lines plus the green ghost. Strong, and barely distinguishable from its own idle frame — which is the point: at 0.72 there is only one strength. |
| `ground022-renaissance-placing` | Section lines and ghost arrive over a quiet ground. The mode change is unmistakable, and this is what "two strengths" looks like. |
| `ground072-prehistoric-cold-open` | Era one, today. The classic look, and the one nobody complained about — era one is small enough to carry it. Worth keeping in mind that this change quiets it too. |
| `ground022-prehistoric-cold-open` | A meadow with a plot marked on it. To my eye better than the row above, but era one is the row where a reviewer might reasonably disagree, so both are committed side by side. |
| `ground022-renaissance-full-roster` | The demo's own frame: 32 buildings and then the grey annulus, now quietly ruled instead of hatched. The emptiness is still there and is still #544's and Evan's — items 1 and 2 above stand, unchanged. |

## Named residual, not fixed here

**The brighten is carried by the section lines, not by denser cells.** `CityScene`'s drei
`BuildGrid` draws its cells at `cellThickness={0.7}` in `#5f8f46`, a mid-green tuned for era one's
meadow, and on era six's low-chroma grey those cell lines barely register at any thickness — so
the baked grid was doing the fine-cell work in both states, and quieting it quiets the placing
state's cells too. What still brightens clearly is the warm `#f2c14e` section line every third
cell, plus the ghost footprint.

Raising that cell weight was tried and is not shipped: at `cellThickness={1.6}` the placing frame
reads, but era one's cells turn from dark creases into pale strokes over the meadow — it changes
the character of an approved look, which is a call for the lead and not a side effect of a number.
If the placing state should be denser, the fix is that thickness or an era-aware `cellColor`, and
it is one line either way.
