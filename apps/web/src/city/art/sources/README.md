# `art/sources/` — the advisor characters' design sources

Three `.dc.html` design sources, one per advisor character. Each is the **stored original** a
React component was ported from, kept verbatim so the port can be checked against it rather
than trusted.

| File | Component | Status |
| --- | --- | --- |
| `OruAdvisor.dc.html` | `lessons/OruAdvisorCharacter.tsx` | **LIVE** — era one's advisor |
| `MakaAdvisor.dc.html` | `lessons/MakaAdvisorCharacter.tsx` | **LIVE** — era two's advisor, ported 2026-07-31 |
| `CityGuide.dc.html` | `lessons/CityGuideCharacter.tsx` | **PRESERVED AND DELIBERATELY UNWIRED** — a later era's advisor |

**The filename says what the art IS, and nothing more.** `MakaAdvisor.dc.html` is the name
Evan's `Gridwork Eras` export gave the file. Era two's advisor is **Oru, re-dressed as a grain
keeper** — Evan settled that on 2026-07-31 (*"oru redressed"*), which is `D-ET9`'s answer and
retires the name `Ket` for good. **The file keeps its delivered name and that is not a loose
end:** `Maka` is the costume's working title, the shelf holds each source exactly as it
arrived so a port can be checked against it, and under D-ET9 one advisor wears ten costumes,
so a costume named after the person would need a number to stay unique. The name a learner
hears comes from `ERA_ADVISORS`, never from a filename here. See `MakaAdvisorCharacter.tsx`'
header for the argument and `eraAdvisorArt.test.tsx` for the line that enforces it.

Nothing globs this directory for the app's own use. All three files are referenced by exact
path from their components' headers, and Biome excludes `**/*.dc.html` outright
(`biome.json`), so none is linted or formatted. **The one glob that does reach here is the
shelf census** in `lessons/cityGuidePreserved.test.tsx`, which asserts set equality against a
named table of exactly these three sources and their components — see below.

## CityGuide is preserved, not retired

`CityGuideCharacter` was the app's only advisor until 2026-07-28. Era one is the
**Prehistoric** Era, so a hard hat, a hi-vis jacket, a rolled blueprint and a chest skyline
badge are out of period, and Oru replaced it in both surfaces that hosted it —
`lessons/AdvisorNpc.tsx` (lesson narration) and `city/onboarding/DemoReel.tsx` (the
first-run reel).

It is kept for the same reason `art/models/gridwork-modern/` keeps the original Gridwork
building models: **that vocabulary is a later era's art rather than dead weight.** Hi-vis,
a hard hat and a printed blueprint are roughly Atomic-Age-to-Information-Age, so eras 8-10,
and **D-ERA28** makes the advisor per-era art re-dressed at every advance. It comes back
when its era does.

**Which era wears it is not decided, and is not this directory's to decide.** The filename
says what the art *is*.

## Why it stayed here rather than moving to a preserved subdirectory

`gridwork-modern/` is a subdirectory for a **mechanical** reason: every glob reaching
`art/models/` is non-recursive, so a subdirectory is the only way to be invisible to them,
and `buildingAssets.test.ts` pins an exact URL count that a recursive glob would break.

**None of that applies here.** The only glob reaching `art/sources/` is the shelf census in
`cityGuidePreserved.test.tsx`, which asserts this directory holds exactly the declared
sources — set equality both ways, each paired with a component that exists, and each still a
real drawing rather than a stub. There is also nothing to recover: the Gridwork GLBs had been
overwritten in place and had to be restored from `3fd580a`, whereas this file was never
touched, so moving it would cost blame continuity and buy nothing.

**That census was widened from two to three on 2026-07-31** when era two's source landed, and
widening it was the point rather than a cost. A genuine third advisor belongs on the advisor
shelf; hiding the file in a subdirectory to slip past the glob would leave the shelf's own
inventory assertion measuring two of three files, and would break the day somebody made that
glob recursive — the failure mode this section exists to warn about. The assertion is still
equality in both directions, so it still catches an orphan source appearing and a declared
source vanishing.

## What keeps it working, since nothing imports it

An unwired component has no user to notice when it breaks, and **nothing in the toolchain
would report it**: Biome's recommended preset has no unused-export rule, `noUnusedLocals`
is not set, and there is no knip / ts-prune / depcheck in the repo. `tsc --build` and
`biome lint` are both clean with zero importers, which is the point — silence is not
evidence.

So two guards stand in for the missing consumer, and they are deliberately about what a
tidy-up would take:

- **`lessons/cityGuidePreserved.test.tsx`** — sweeps every `.ts`/`.tsx` under `apps/web/src`
  and asserts **no product file imports it**, that the sweep can still see an importer when
  there is one, that all four poses render with their parts present, and that this shelf is
  intact.
- **`lessons/cityGuidePreserved.browser.test.tsx`** — real Chromium against the real
  stylesheet: **`.city-guide`'s block in `styles.css` stays**, all four poses still resolve
  through the cascade, and every part the browser reports as animating is still stood down
  under `prefers-reduced-motion`.

The stylesheet block is the fragile half. Deleting it would leave `CityGuideCharacter`
rendering overlapping unstyled SVG at every mood with nothing to say so until someone tried
to wire it up — which is the archaeology this preservation exists to avoid. **Re-wiring it
for its era should be a wiring job.**
