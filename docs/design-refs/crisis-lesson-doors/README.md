# The defect: a roster row opens a lesson over a running crisis

`1024x580-defect-roster-row-opens-a-lesson-over-the-crisis.png` is the reported defect,
photographed in real Chromium at **1024x580** under `reducedMotion`, over the real
`CitySurface` with a real Hard Winter running on the island.

It is the failure screenshot `crisisShutsTheLessonDoors.browser.test.tsx` keeps when its
assertion fails, taken with the two halves of the fix injected back out of `CitySurface`:

- the roster row's `disabled={crisisHasTheIsland}`, and
- `openLessonPopup`'s `if (crisisHasTheIsland) return`.

That pair is the state the tree was in at `51c0a7d6`, so the frame is of the tip's own
behaviour rather than of a state nobody shipped. The message beside it reads:

```
a real mouse press on a roster row opened a lesson popup underneath the crisis panel:
  expected <div class="building-callout" …(3)>…(2)</div> to be null
```

## What to look at

The Hard Winter's panel is down the left: round 1 of 3, the two actions, and a commit control
that is still refused because nothing has been declared. The lesson menu for **Assembly Hall,
Roundhouse** is open over the island beside it, offering Review lesson / Practice set /
Infinite practice — a lesson the player did not ask for, in the middle of a timed encounter.

Along the bottom, at `opacity: 0.22`, are the two controls that opened it: the Buildings
disclosure and the Build button. The dimming is real and is the only part of
`winter-in-city.css`'s "the city's controls stand down" that ever worked.

## On the word "underneath"

The report said the popup renders *underneath* the crisis panel. That is a z-order fact rather
than something this frame happens to show: `.building-callout` is `z-index: 8` and
`.winter-in-city` is `z-index: 60`, so the crisis panel is on top wherever the two overlap. The
popup is glued above the building it belongs to, and in this frame that building is right of
the panel, so they do not overlap here. The substance of the complaint — a lesson opening
during a crisis — is what the frame shows.

## No "after" frame

There is none, and none is owed: after the fix no lesson surface can be put on screen while a
crisis is running, so there is nothing left to photograph. The claim is discharged by the
tests, which is the case the QA rule allows a test to settle on its own.
