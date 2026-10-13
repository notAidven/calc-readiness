# The three accepted rulings, photographed

Eight frames, all **1024x580**, all under **reduced motion**, taken by
`apps/web/src/city/three/successionRulingShots.browser.test.tsx` against the real engine and the
real procedural geometry.

    VITE_SUCCESSION_RULING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
      apps/web/src/city/three/successionRulingShots.browser.test.tsx

Off in CI, for the reason the atlas next door records: a shadow-mapped island left switched on
starves an animation-timing assertion somewhere else, once per run, in a different file each time.

## Why every ruling is a pair

Each of the three is a claim about a **difference** — see-through against solid, proud against
flush, clear against touching — so a single frame of the new state is a picture of the one thing
nobody doubted. Every pair here shares its viewport, its camera heading and its zoom; the only
thing that changes between the two halves is the ruling.

Two of the "before" halves were taken with the shipped code temporarily wound back, and it is
worth being explicit about which and how, because a frame is only evidence if you know what
produced it:

- `04a` was captured with `DRIFT_BLOCK_CLEARANCE` set to the pre-ruling **0.35**, then the
  constant was restored and `04` captured from the same test at the same camera.
- `06`'s left half is the shipped component with one CSS rule suppressing its counter shadow, so
  both halves are the same component at the same scale.

## The frames

| # | Frame | What it shows |
| --- | --- | --- |
| 01 | `01-claim-committed-forum` | A contested Grain Dock with nothing in the plan: shutter boards solid across every bay, the corner marker standing dark at the left corner. |
| 02 | `02-cancel-planned-forum` | The same building with a **cancel** in the plan. The boards have gone see-through and the colonnade is legible through them; the marker has gone thin with them. The mass, the columns and the roof are untouched. |
| 03 | `03-secure-planned-forum` | A **secure** in the plan — both directions of the vocabulary in one frame. The same boards going, and the plate that would replace them arriving as a ghost with its chevron. |
| 03b | `03b-plate-committed-forum` | The control: the same spend **committed**. A solid marble plate in the same seat, the boards and the marker gone. |
| 04a | `04a-drift-block-before-0.35-forum` | The drift block at the pre-ruling clearance, hard against the plinth's bottom step. |
| 04 | `04-drift-block-clearance-forum` | The same block at **0.55**, with paving between it and the stonework and its own shadow falling clear. |
| 05 | `05-counters-in-the-surface` | The counting slab at the size it actually ships at, in the planning panel, beside a card carrying its price in the same object. |
| 06 | `06-counter-relief-magnified` | The counter flush and the counter proud, side by side at 6x. |

## An honest read

**The cancel grammar works, and it is the strongest of the three.** Put `01` and `02` side by
side and the subtraction is unmistakable: in `01` the boards are opaque timber and the building
is plainly shut, and in `02` the same boards are a haze you can read the limestone colonnade
through. Nothing else in the picture moves, which is the point — the building stays solid, so
there is something for the removal to be a removal *of*. The old overlay could not have produced
this frame at any opacity, because it drew a second mass with nothing on it rather than thinning
the things that go.

**`03` is the frame that earns the phrase "one vocabulary, two directions".** The boards are going
and the plate is arriving, in the same picture, told apart by value alone with no added mark. Held
against `03b` the two plates read correctly: the committed one is bright marble, the proposed one
is darker and you can see the boards through it.

**The counters are correct and faint.** `06` settles the direction question — the flush counters
on the left are flat discs that disappear into their seats, and the proud ones on the right read
as objects sitting in a cut. But `05` is the frame that matters, and at life size the relief is
*subtle*: a counter is 9 CSS pixels across and its shadow is under a pixel of offset, so what you
actually see is a slightly heavier lower edge rather than an object standing proud. It is better
than flush and it is not emphatic. **If the lead wants this to read at a glance, the lever is the
slab's own size, not the relief** — the SVG is drawn at its intrinsic 53x38 and nothing stops it
being rendered larger.

**The drift block's clearance is real and small.** `04a` against `04` is a genuine improvement:
the block moves off the plinth's bottom step and its cast shadow lands on open paving instead of
merging into the plinth's. But it is a 0.2u move photographed at 1024x580, which is a handful of
pixels, and it does not do as much as the ruling's reasoning hopes. **What actually makes the
block hard to find in `04` is not the plinth — it is the boundary stones.** The block stands in a
crowd of eight pale cubes of similar value, and on this board they are unmarked (the district is
unclaimed), so the one thing separating the block from them at a glance is the chevron cut into
its top face. The chevron does the work; the clearance helps the shadow and the size difference
is doing less than its 1.55-against-1.02 suggests, for exactly the reason the ruling gives about
the 49° camera. **Recorded as a partly-open item, not a solved one**: the pair in
`../succession-crisis/README.md` that says these two objects are hard to separate at distance is
now less true and not untrue.

## Related

- `apps/web/src/city/three/successionScene.ts` — `fadeSuccession`, `REMOVAL_OPACITY`,
  `DRIFT_BLOCK_CLEARANCE`, `PLINTH_BASE_SPAN`
- `apps/web/src/succession/SuccessionRail.tsx` — the counting slab and its relief
- `apps/web/src/succession/successionRulings.test.tsx` — the numbers, each watched go red
- `../succession-crisis/` — #488's own atlas, which these frames extend
