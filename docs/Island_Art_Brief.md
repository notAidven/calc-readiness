# Island art: what the code hands you

For Evan, on the archipelago's ten islands. **The technique is yours.** The rest is the sizes
you are drawing to and the few things the code has already fixed.

Both PRs are open, not merged: #568
is the design and #575 builds the
overview behind a `?bay` dev flag. Figures below were re-measured at #575's `0a862bc6` and
`integration`'s `a022e651`, not quoted.

## What you choose

An illustrated map, a 2.5D composition and a light 3D patch all satisfy the code equally, and
**nothing in the seam decides between them** — #568 costed all three and deliberately picked
none. Also yours: the palette per era, the haze curve, what a locked island looks like against a
completed one, and what an era actually looks like as a place.

The seam is one prop. `ArchipelagoOverview` and `BayMap` take `renderIsland`, defaulting to
`PlaceholderIslandArt.tsx`, which is the file you replace:

```ts
interface IslandArtProps {
  readonly island: ArchipelagoIsland; // era, name, number, state, mastery, stores
  readonly cx: number;                // centre, in frame pixels
  readonly cy: number;
  readonly r: number;                 // how far your drawing may reach from that centre
  readonly reveal?: number;           // 0..1 out of the haze; 0 except mid-unlock
}
type IslandArtRenderer = (props: IslandArtProps) => ReactElement | null;
```

A centre, a radius, the island's state and its reveal. No SVG type, no DOM node, no three.js
object. `r` is the full footprint, and `island.grassRadius` against `island.footprint` tells you
how much of it is land and how much beach. `reveal` is the era advance bringing the next island
out of the haze, handed to your renderer rather than filtered over it, so the haze and the haze
coming off are one thing you own. One caveat: the call sits inside `BayMap`'s `<svg>` today, so
a non-SVG technique also moves the mount point — a few lines of `BayMap.tsx`, and no change to
what you are handed.

## The size it has to work at: 103 pixels

In the overview all ten islands are on screen at once. At **1024x580** — the short viewport the
composition was fitted to — **era one's island is a circle 103 CSS pixels across**, measured in
a real browser frame rather than computed. Of that, 91px is land and a 6px ring each side is
beach. Across eras one to ten:

**103 / 109 / 109 / 109 / 103 / 109 / 109 / 118 / 112 / 112 px.**

**This is the size the design has to be recognisable at**, and it is the easiest number here to
miss. Something that reads beautifully at working distance and turns to mush at 103px is the
failure mode. If you compose larger, check it here before committing to a direction.

## The island sizes, per era

World units. **Grass** is the drawn land; **buildable** is the disc a learner may place on.

| era |  | cells | buildable | grass | era |  | cells | buildable | grass |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Prehistoric | 47 | 22 | 30 | 6 | Early Modern | 58 | 24 | 32 |
| 2 | Neolithic | 48 | 24 | 32 | 7 | Industrial | 50 | 24 | 32 |
| 3 | Bronze Age | 48 | 24 | 32 | 8 | Atomic Age | 72 | 27 | **35** |
| 4 | Classical | 52 | 24 | 32 | 9 | Information | 60 | 25 | 33 |
| 5 | Medieval | 46 | 22 | 30 | 10 | Cyberpunk | 63 | 25 | 33 |

An island holds **one era's** city, which is why these are small. The growth ceiling is 46 and
the largest island the design ever needs is grass 35, eleven under it. That headroom is what the
whole archipelago rests on, so an island drawn bigger than its row spends it.

## The two gaps blocking the overview

Both are named in #575 as yours, and both are what stops the closing frame landing.

**Ten islands that are one island.** Every island is the same green disc with the same three
roofs in the same tones, whatever era it is, so the screen reads as *ten places* rather than
*ten different places*. The closing frame — all ten unlocked, nothing hazed — is exactly the
frame the bay was chosen over a straight chain to deliver, and it will not land until per-era
palettes exist. `docs/design-refs/archipelago-overview/bay-10-unlocked-1024x580.png` is that
frame as it stands.

**The haze is a linear guess and too gentle.** The placeholder walks opacity
1 / 1 / 0.82 / 0.58 / 0.32 and saturation 1 / 1 / 0.66 / 0.38 / 0.14 across the five states, and
in `bay-05-unlocked-1024x580.png` the far islands are still crisp discs with hard edges — a good
deal more present than #568's *"a suggestion of land"*. The states are completed, current, next,
distant (2–4 ahead) and horizon (5+). The one structural rule: haze keys on **how far ahead an
island is in the sequence, never on camera distance**, because a distance fog resolves the
moment a learner pans and then they can count the run.

## The mesh budget, and what it governs

You may have been told the ceiling is 2,600 and today's island peaks at 2,218. The ceiling is
right; **2,218 is stale**, a superseded "before" column in `islandMeshBudget.test.ts` that #544
overtook when it merged on 2026-08-04 — after #568 was written, which is why #568 still quotes
it. At the tip the counts are 545 / 1,100 / 491 / 526×7: dearest 1,100, **1,500 unspent, 58% of
the ceiling**. It measures one island's *terrain*, so it lands on your two cases very
differently.

**An island you enter: 2,600, and clear.** Measured with the same builder at the per-era radii
above, an archipelago island costs 545 / 1,019 / 360 / 360 / 344 / 360 / 360 / 403 / 379 / 379 —
dearest 1,019, **at least 1,581 unspent**, every island cheaper than today's because it is
smaller. That counts sea, shore, placement grid and scatter; buildings are GLBs and are not in it.

**The overview: no budget has been established.** 2,600 is per-island terrain and says nothing
about ten stylised islands at once. The overview is an SVG today and costs zero meshes, and
#568's claim that the archipelago is free rests on it staying stylised. **If you want it
rendered in 3D, nobody has costed that and there is no honest number to give you** — flag it
early and it gets measured. The one relevant datum is #568's warning against reusing the *city*
camera for it, which would sit 524–1,071 units out against today's widest 179 and z-fight the
road decals.

## What is fixed

**The bay's geometry and the island positions.** A 180° arc of radius ~289, x at −289, −272,
−223, −147, −55, 42, 137, 218, 271, 289, a 649×359 box (aspect 1.808), 28 units of open water
between every pair of shorelines. Solved to fill a 16:9 frame at a short viewport, and **the
frame is the argument**: #575's first build put the map in a card with a list beside it, passed
every unit test, and rendered the islands at **52px**. Anything that takes layout away from the
bay discards the geometry.

**The town hall is the island's landmark.** Each island keeps the hall the learner raised on it,
resolved per era, so no new monument asset is wanted. One precision: `TOWN_HALL_ERA_MODELS` is
authored for eras one to five only — six to ten resolve `unauthored` and stand in era one's hall
with a line saying so. The slot is filled; five era halls are still owed.

**The marks the map owns rather than the art**: the numeral, the caption, the hit target, the
focus outline, and the orange ring on the island the learner is standing on. Your drawing stays
inside the circle you are given.
