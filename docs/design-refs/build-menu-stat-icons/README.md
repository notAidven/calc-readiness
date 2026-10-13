# The build menu after the 2026-08-04 QA pass: a named statistic, two doors closed, Civic moved up

Three items from the lead, looking at a running build. All frames are **1024x580 under reduced
motion**, in **era two** (`?mock&mastered&era=neolithic` on a dev server), captured by
`output/build-menu-stat-icons-shot.mjs`; the `05`–`07` composites are stitched from those frames
by `output/build-menu-stat-icons-compare.mjs`.

The `before` half is the merged tip **`cee31658`** on `integration`, photographed by running the
same script against the same server on that checkout. Nothing about the capture differs between the
two halves, which is what makes the pair comparable.

| frame | what it shows |
| --- | --- |
| `01-{before,after}-tabs-on-open` | the category strip as the menu opens |
| `02-{before,after}-civic-cards` | the Civic tab, with the CITY LIFE panel behind the dialog |
| `03-{before,after}-first-card-actual-size-crop` | The Granary at **1:1 pixels**, which is the size the glyph actually is |
| `04-{before,after}-first-card-magnified-3x` | the same card re-rendered at `deviceScaleFactor: 3` |
| `05-tabs-compared`, `06-civic-cards-compared`, `07-first-card-magnified-compared` | the pairs side by side, labelled in the image |

`03` and `04` are named for what they are. `04` is a **re-render** at three times the pixel
density and not an upscale of `03`: an upscale of a 17px drawing shows the upscaler's guesses. The
CSS viewport is identical in both, so the layout is identical and neither says anything about
spacing that `02` does not say better.

Era two is the era the frames are taken in because **The Granary** is the card the lead quoted, and
it is era two's food row. `?mock&mastered` seeds era one complete, without which every era-two card
is correctly prerequisite-locked.

## Item 1 — the statistic is named, and its icon is the panel's

Read `07` first, which is the whole item in one picture.

Before: *"Sustains 40 more · 2×1 plot"*, in muted grey, with no glyph on the line at all — the
`measured-before.json` read-out records `glyphs (none)` for all four cards. After: **`40 Livability`
behind the house** the CITY LIFE panel labels its Livability row with, inked and at 600 weight,
with `2×1 plot` left muted beside it.

The panel already had both glyphs, so nothing was invented: `HudIcon name="home"` and
`CityVitalityPanel`'s own `HappinessFace`, both **imported** by the card rather than redrawn.

**The measured glyph sizes**, from the same runs, are why the icons are sized on the card rather
than inherited: the card's provides line is 0.8rem where the panel's rows are 0.6rem, so the house
is **17.9px** here against the panel's 13.9px, and the face is **21.8px** against the panel's
17.8px. `HudIcon`'s 1.05em base would have made the house 13.4px on this line.

### The face smiles on a card and frowns in the panel, in the same frame, on purpose

Visible in `02-after`: the cards' faces are smiling and the panel behind the dialog is `unhappy`
(this city is 9 of 44, `restless`). The panel's mouth is a **reading** of the band the city is in; a
card quoting `+10 Happiness` has no band, so the card fixes the `content` mouth and shares
everything else. `CitySurface.civic.test.tsx` asserts exactly that split — outline and eyes
identical, mouth required to be the `content` row of the panel's own table.

### One rider visible in `07`: the price tag's glyph

It was `HudIcon name="building"`, which is what the panel labels **Population** with. Harmless
while nothing on the card pointed at that panel, and a collision the moment the line above it did.
It is `gem` now, which is already the material glyph in `EconomyHud.tsx` and on the roads card's own
price tag.

### What the first frame caught that no test would have

The first capture of this copy had the clauses as inline-flex spans in a `·`-joined sentence. An
inline-flex box takes its baseline from the svg inside it, and an svg's baseline is its bottom edge,
so `40 Livability` rode two pixels above the `2×1 plot` beside it; and a 186px card broke after the
first clause, leaving the separator at the end of a wrapped line where it read as a full stop. The
provides line is a wrapping flex row now, and the separators are gone with the mechanism that broke
them. Every assertion in the suite passed in both states.

## Item 2 — Decorations and Defences are gone

`05` is the item. Before: **Lessons · Roads · Decorations SOON · Civic · Defenses SOON**, the two
placeholders greyed with their pips, both `aria-disabled="true"` in the same run's read-out. After:
**Lessons · Civic · Roads**, three tabs, no pip on any of them.

They were empty placeholders with no catalogue row behind either — nothing was cut but the two
doors. `apps/web/src/city/buildMenuCategoriesAreLive.test.tsx` is what keeps them gone, and it
replaces the assertion the Decorations tab used to be the witness for.

## Item 3 — Civic before Roads

Also `05`. The order lives in `BUILD_TABS` in `apps/web/src/city/CitySurface.tsx` and nowhere else;
one array element moved.

## What is in the frames that is not this pass

Two dev-only panels sit at the top corners on a dev server (the catch-up placer and the onboarding
replay), collapsed to their title chips here. A learner build has neither. And every card carries
*"Not enough grain yet: you have 0"* because this dev city has no era-two material banked — that is
real product state and it is in both halves, so it is not what changed.
