# The advisor's ten costumes, photographed

**Regenerate with:**

```
VITE_ADVISOR_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/advisorWardrobeShots.browser.test.tsx
```

**Committed rather than left in `__screenshots__/`**, which is gitignored, following the
precedent `docs/design-refs/crisis-panel-width/` set: a shot nobody can open is not evidence
in a review. **These are references and not shipped assets** — nothing under
`docs/design-refs/` is reachable from the app, the city renderer loads no image texture at
all, and that should stay true.

The direction they are evidence for is
`docs/superpowers/specs/2026-08-01-advisor-per-era-dress.md`.

## What the set is FOR, which is the reason it is ten and not three

`advisorDress.test.ts` proves the ten costumes differ as data, and `advisorWardrobeShots`'s
two always-on tests prove they differ as rendered boxes and colours. **Neither can see one
box land on another.** A costume element crossing the face, a value that disappears into the
ground it stands on, a silhouette that stops reading — none of those fail a test, and all
three are visible in a second by looking.

That is not a hypothesis. **Era ten's collar once put a lit line across the advisor's mouth**,
and it was found by looking at era ten's frame while `advisorDress.test.ts` was green. The
frames exist so that the next one of those is found the same cheap way, in **every** era
rather than in the three that happened to be photographed.

`.cursor/rules/qa-verification.mdc` is what decides the population: scope a guard by who
exhibits the behaviour. *"The advisor stands over the island in this era's clothes"* is true
of all ten eras without exception, so `ON_THE_ISLAND` is derived from `ERA_SEQUENCE` rather
than written down, and an eleventh era joins the set with no edit to the test.

## The viewport is half the evidence, and it is 1024x580

The lead reviews in a short window. Every frame here is at his, and the size is in each
filename rather than left to be inferred.

| File | What it is |
| --- | --- |
| `00-wardrobe-contact-sheet-1024x580.png` | All ten costumes side by side at about 120px each, which is the size the onboarding reel draws the advisor at. On `#ECE4D3`, the Art Bible's parchment ground, because a costume is only legible against the surface the city is drawn on. The one frame here that is not a whole viewport: its subject is the wardrobe rather than any one costume. |
| `prehistoric-crisis-1024x580.png` | **Era 1.** The baseline, and the only era standing on its own authored terrain. |
| `neolithic-crisis-1024x580.png` | **Era 2.** The first advance, and the one that sets the pattern: era one's full-height staff is gone. |
| `bronze_age-crisis-1024x580.png` | **Era 3.** |
| `classical-crisis-1024x580.png` | **Era 4.** The era whose one strong colour is a band at the hem, which is what `measured-1024x580.txt` was written to settle. |
| `medieval-crisis-1024x580.png` | **Era 5.** |
| `renaissance-crisis-1024x580.png` | **Era 6. Historical colour frame, silhouette reference only.** This shot captures the superseded dusty-rose intermediate pass. The live overgown is warm buff `#C7A48E` with dark slate/sheet-lead trim `#596675`; do not use this frame or its contact-sheet cell as a colour reference. Era four beside it remains valid and unchanged. |
| `industrial-crisis-1024x580.png` | **Era 7.** |
| `atomic_age-crisis-1024x580.png` | **Era 8.** |
| `information_age-crisis-1024x580.png` | **Era 9.** Its own dress row calls it *"the hardest one to dress"*, because the era's defining feature is an absence. |
| `cyberpunk-crisis-1024x580.png` | **Era 10.** The end of the walk, and the only costume with an emissive note, which is the one that could clash hardest with the ground it stands on. |
| `measured-1024x580.txt` | The figure's box, measured on each frame. Ten lines, one per era. |

**Alphabetical order is not era order**, because the filename is the era's own id. The
column above is the reading order; `measured-1024x580.txt` is written in era order too.

## Which frames came from which run

The seven added on 2026-08-01 — eras 2, 3, 4, 5, 7, 8 and 9 — plus
`measured-1024x580.txt` come from **one green run** at the tip that first carried all ten.

The contact sheet and eras 1, 6 and 10 are `#385`'s, **carried forward unchanged rather than
re-shot**. They were re-shot at the later tip and compared before that was decided: the only
differences are animation phase — the mastery-star twinkle, the crisis panel's sparkle, and
the advisor's own breathing swing — at most 0.65% of pixels past a delta of 8 out of 255.
Their three lines in `measured-1024x580.txt` are also byte-identical to the ones `#385`
wrote. So they are of this tree, and re-committing three binaries to prove it would have
cost a reviewer three diffs that say nothing.

## The ten island frames are the WHOLE viewport, on purpose

They are not cropped to the advisor. **A costume that clashes with the island it stands on
is the failure mode**, so the subject is the surface; cropping to the character photographs
the one part of the picture nobody doubted. Each is the real `CitySurface` with its real
canvas, island, hall and HUD, with the crisis dialogue opened through `☰ Menu → Hard Winter`
— which is the surface the advisor is largest on, `clamp(132px, 30vh, 232px)`. Measured on
the frames rather than off the stylesheet, that is **255px tall with 100% of it inside the
580px window**, top at `y=307`, in all ten.

## Three things the frames do NOT show, named rather than left to be discovered

1. **Nine of the ten eras are standing on the same grey island, not on their own**, and with
   ten frames that is now a measurement on the pictures rather than a claim about the data.
   Sampled at `x 215..232, y 330..350`, era one's ground is `rgb(140,156,69)` — its own grass
   — and the other nine are `rgb(125,121,110)`, with identical medians *and* identical
   per-channel standard deviations. Nine eras carry `land: { status: "unauthored" }` under
   `D-ERA25`, so there is no era-six or era-nine terrain to photograph a costume against.
   **The clash question is answered for era one and deferred for the rest**, and it will need
   re-asking era by era as each one's land is authored.
2. **The board behind the dialogue is era one's winter in all ten**, because
   `resolveCrisisEra` falls back to the earliest era with authored land. The advisor
   deliberately does not fall back with it — the board may be borrowed, the person handing
   it over is the player's own advisor — which is what the frames are showing.
3. **The mouth's open/shut state is not comparable between frames.** `@keyframes oru-talk`
   scales the talking mouth `scaleY` from 0.32 to 1 on a 0.3s loop, so each capture catches
   an arbitrary phase: the mouth is wide open in eras 1, 4, 5, 6 and 10 and close to a line
   in eras 2, 7, 8 and 9. That is the clock, not the costume. It also means a frame that
   catches a nearly-shut mouth **understates** anything crowding it, which is worth knowing
   given what this class of frame was first useful for.

## What is out of scope here

The advisor's persona and the per-era costume *design* are Evan's lane
(`docs/Content_Authoring_Split.md` §1.1). These frames photograph what exists. A frame that
reveals a design problem is **reported, not fixed** — see
`work-log/gabe/2026-08-01-ten-frames-of-the-wardrobe.md` for what looking at all ten turned
up.
