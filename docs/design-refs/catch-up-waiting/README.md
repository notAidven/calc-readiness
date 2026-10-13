# The auto-layout's shortfall, said on screen

**Frames at 1024x580 under reduced motion, on the real city with its real canvas**, by
`apps/web/src/catchup/catchUpWaitingShots.browser.test.tsx`. Copied to
`output/catch-up-waiting-*.png`. Regenerate with

```
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/catchup/catchUpWaitingShots.browser.test.tsx
```

## What they are of

The product lead reported *"i dont think 'let the city place the era's buildings for me' button
works."* It does. Measured against the real session, one press per handed age seats **6, 5, 5, 2,
1, 0** buildings over a six-age placement — the fifth press seats one and **the sixth seats none**,
which is indistinguishable from a dead button to the person pressing it. The island runs out of
room because `isCellBuildable` closes over `BUILDABLE_RADIUS`, so the buildable disc stays at era
one's 88 cells however far beat two grows the drawn land.

**What was this surface's defect is that it never said so.** The shortfall was reported through
`CitySurface`'s `setPolite`, whose region is `visually-hidden` with `aria-live="polite"`: a
screen-reader user was told and a sighted learner was told nothing at all. These frames are the
fix.

### `01-prompt-with-the-notice.png`

The stop prompt at age 1 of 6, with the notice under the forfeit line: *"13 buildings had no room
on the island yet. They are waiting in the build menu."*

**Read:** the notice sits at the bottom of the well at y≈535 of 580 and all three roads are at
325–410, well clear of the fold — which is the assertion beside the frame, measured on the
**buttons** rather than on the well, because the last line added to this well pushed the roads 70px
below the fold while every assertion about the well's own height stayed green. It takes no warning
colour and no icon, which is deliberate: nothing has gone wrong for the learner, the buildings are
theirs and are waiting for them, and a red triangle over *"your city is complete"* would read as a
failure they caused. A hairline sets it apart instead.

**Two things in frame that are not this change**, said so a reviewer does not read them as it. The
build menu is open behind the prompt because the diagnostic reward's *"Start building"* opens it,
which is existing behaviour and means the island is mostly hidden at this exact moment. And the
`Replay onboarding` panel in the top-right is another lane's dev hatch.

### `02-founding-with-the-notice.png`

The same notice on the founding's caption, which is the surface that appears **the instant the
button is pressed** and therefore the first place the sentence can land.

**Read:** the caption grows by two short lines and stays a caption. This is the frame that matters
most for the original report, because this is what the lead was looking at when he concluded the
button did nothing.

## Two shortcuts in the test, both declared

1. **The count comes from a `waitingOverride` test seam.** The shortfall arises naturally at the
   fourth handed age, and reaching it means three real foundings at the shipped 45-to-60 seconds
   each. A version of this test that walked there **timed out at 300 seconds** — a fact about the
   walk worth having, and a test nobody would keep. The seam overrides the COUNT and nothing else;
   the sentence, its placement and the surfaces it appears on are the shipped ones, and the count
   itself is measured with no seam in the path by
   `apps/web/src/catchup/catchUpSaysWhenItCannotSeat.test.tsx`.
2. **It mounts the real `CitySurface`**, not `CityCatchUp` alone. A faster version mounted the walk
   inside a hand-built `.city-shell` and produced a frame in which **none of the design tokens
   resolved** — pale blue type on a pale blue panel, true about the boxes and useless about whether
   a person can read it, which is the only question a frame is here to answer. That version is not
   kept.
