# The island's middle is bare ground, not a sheet of stickers

The rendered evidence behind the 2026-08-05 ruling that the buildable disc carries no scattered
ground decals — and the identification of what the lead was actually looking at.

The lead, on a frame of the island in the running game:

> remove these random pieces of crap that i pasted - they look terrible.

## What they were

`earthPatch` in `apps/web/src/city/three/StarterIsland.tsx:433`, which draws three to five
`wornLump` discs (`StarterIsland.tsx:1246`) in a cluster. Each lump is
`new THREE.CylinderGeometry(r, r * 1.1, DECAL_THICK, 7)` — a flat **seven-sided** plate, which is
the "rounded hexagon" in the lead's frame — flat-shaded in `t.earth` (`#c9a06a`) or `t.earthWorn`,
with `DECAL_THICK` of height and so nothing to cast a shadow and no silhouette. One `earthPatch`
is exactly the "cluster of roughly three or four blobs, close together" the complaint describes.

**They are not in `integration`.** Measured off the built scene graph at `92b91aab`: seven meshes
stand inside the decoration floor at every one of the ten eras, and all seven are at `r = 0.000` —
the island's own centred ground stack (the sea plate, the land prism, the grass surface, two sand
courses, the shore skirt, the placement grid). Zero off-axis meshes, at every era. Trunk's only
`earthPatch` call site is `StarterIsland.tsx:2390`, into the margin ring and gated on
`dressing.props` — the four camp props' own footprints, which is why the `after` frames still show
this family along the shoreline. In its authored place it reads as beach; on the meadow it reads as
a sticker.

The scatter is `walkedGround`, added by
#582 (`OPEN`, `mergedAt: null`), which
runs `earthPatch` over the whole disc at era one's margin density. Applied to `92b91aab` it takes
era one from **7** meshes inside the floor to **167** — 160 flat decals on ground a learner builds
on. The `before-*` frames here are that hunk applied to this tree; the `after-*` frames are this
tree untouched.

## ⚑ Every frame was re-taken when #566 landed mid-run

#566 merged at `2026-08-05T02:56:18Z`
(`e03380b8`), which is after the first set of these frames was taken, and it changes what they show:
the placement grid is now gated on `placing`, so the shipped default paints no grid over the
island's middle. A finding is evidence about a SHA rather than about the repository, so all eight
were re-taken at `92b91aab` instead of being carried over from `c884565d`. The earlier pair had
grid lines across the meadow; these do not.

## Why the frames are committed, when `__screenshots__/` is gitignored

`.gitignore` excludes `**/__screenshots__/` because what lands there is regenerated every run and
is meaningless afterwards. These are kept for the opposite reason. The claim is visual — *"do these
read as objects in a world or as stickers on the grass"* — and `.cursor/rules/qa-verification.mdc`
is explicit that a passing layout test cannot settle one: *"a spatial claim owes a rendered frame
that someone LOOKED at."*

**The viewport is in every filename, and 1024x580 is the lead's own window.** Two framings per era,
neither cropped to the props:

- `whole` is the resting camera — the whole island, so the middle reads against the dressed margin
  around it;
- `near` dollies to `VILLAGE_CAMERA.minDistanceRatio`, the closest the shipped camera lets a player
  get, which is the scale at which a flat decal stops reading as ground. The grass is in shot on
  every side, because *"cropped to the element that changed, a screenshot proves nothing about
  occlusion: the element is the one part of the picture nobody doubted."*

Two eras: `prehistoric`, whose art is shipped and approved, and `classical`, whose disc is 41 of a
46-unit grass radius — 79.5% of the ground by area, so a scatter inside it is at its most visible
there. Every frame is the shipped `CityScene` under reduced motion, with a two-identical-captures
stability gate.

## Regenerating them

    VITE_ISLAND_DISC_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
      apps/web/src/city/three/islandDiscCarriesNoDecalScatter.browser.test.tsx

That rewrites the four `after` frames and their `output/` copies. The `before-*` frames need #582's
hunk applied first:

    git show 155ace74 -- apps/web/src/city/three/StarterIsland.tsx | git apply
    VITE_ISLAND_DISC_SHOTS=1 VITE_ISLAND_DISC_SIDE=before npx vitest run \
      --config vitest.browser.config.ts \
      apps/web/src/city/three/islandDiscCarriesNoDecalScatter.browser.test.tsx
    git show 155ace74 -- apps/web/src/city/three/StarterIsland.tsx | git apply -R

## The guard, and the seven reds behind it

`apps/web/src/city/three/islandDressingFillsTheIsland.test.ts` already refused this scatter before
any of the above: injecting #582's hunk fails `keeps the floor: nothing decorative reaches a cell a
building could stand on` at *"prehistoric puts decoration at 1.018, against a floor of 25"*. It was
never loosened here, and nothing about the emptiness of the middle was traded away to make anything
pass.

What it did not have was a closed exemption. `terrainMeshes` partitions named subtrees out of its
population, and that set was open — a fourth name is a one-line change that reads in review as
declaring a subtree and takes the floor's teeth out, which is how #582 lands. `FLOOR_EXEMPT_SUBTREES`
now holds the two members beside their reasons, the floor is re-measured over the whole tree with
nothing partitioned out, and the exemption is asserted both ways.

`output/island-disc-carries-no-decal-scatter/injections.py` forces each of those assertions false in
turn and records what caught it; `injections.json` is its output. All seven go red, and the guard is
green again on the way out. The two that matter most:

- the scatter alone fails *"keeps that floor over the WHOLE tree"* at **"prehistoric draws 160
  meshes on the buildable disc, the closest at 1.018 against a floor of 25"**;
- the scatter **declared exempt** — #582's own shape — still fails, at **"island-walked-ground is
  exempt from the density and draws at 12.842, inside the floor of 25 — an exemption from a count is
  not a licence to stand on the buildable disc"**, which is an exemption naming what it excuses.

## Why the middle is not re-dressed instead

#566 and #582 were both written for *"the island's middle is empty"*, so removing a dressing risks
reintroducing what they fixed. It does not here, and #566's own title is the reason: *"the island's
empty middle is not a dressing defect — the grid drawn over it is."* Its measurement is that the
middle reads as an unfinished build site because a placement grid is painted over ground that carries
no decoration at any era, and its fix is to gate the grid on `placing`. The emptiness is the design —
the disc is where buildings go, which is why the floor exists at all — so the answer is the grid, not
props.

**And that fix has landed.** #566 is `MERGED`, read off `mergedAt` rather than inferred from pushes,
so the `after-whole-prehistoric` frame here is the shipped island with no grid on it: a green meadow
with a dressed wooded rim, which is #566's own stated bar. The defect #582's scatter was written
against is already closed in trunk by the pass that diagnosed it, and closed without pasting anything
on the middle. Nothing in #566 was touched here.

Nothing was replaced either. The lead asked for removal, the props are not in trunk, and inventing
grounded art nobody has approved would be answering a different request.
