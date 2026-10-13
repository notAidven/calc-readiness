# The intro onboarding, photographed

**Regenerate with:**

```
VITE_ONBOARDING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/onboarding/onboardingAdvisorShots.browser.test.tsx
```

**Committed rather than left in `__screenshots__/`**, which is gitignored, following the
precedent `docs/design-refs/advisor-wardrobe/` and `docs/design-refs/crisis-panel-width/` set:
a shot nobody can open is not evidence in a review. **These are references and not shipped
assets** — nothing under `docs/design-refs/` is reachable from the app.

## What these are evidence for

The product lead, reviewing the intro on 2026-08-04: *"it really doesn't explain what the game
does and is awful user experience."* And again on 2026-08-05, on the rebuild that answered it:
*"oru is way too simplistic now - he's like lost all his personality whatsoever [...] they
should actually have to place the building and not just drag a house into a 2d box like what
is the point of that bro."* Every item under both verdicts is a claim about comprehension or
about the picture, so `.cursor/rules/qa-verification.mdc` decides what discharges it: a
rendered frame somebody LOOKED at, at a named viewport, framed to show the thing being claimed
about **and** what is around it.

So there is a frame per slide, four frames of the learner placing a real building through the
city's own Build menu, a frame of the gate being held, and the before frames beside them.

## The viewport is half the evidence, and it is 1024x580

The lead reviews in a short window, and the figure is sized in `vh`:
`clamp(148px, 44vh, 280px)` is 280px on a tall monitor and **255px here**. A frame at 1440x900
would make any overlay look roomy. Every frame is at his window and says so in its own
filename, and every one is taken under an emulated `prefers-reduced-motion: reduce` — which is
the HARDER case for a spotlight, because it stands the ring's pulse down and leaves the static
ring to carry it.

Every frame is the **whole viewport**, never a crop. *"Can you still see your island"* and
*"does that control stand out from what is around it"* are both questions about the picture as
a whole, and cropping to the ring photographs the one part nobody doubted.

Two things are stubbed off in the after frames, both named here so nothing is hidden:

- **The dev replay panel**, which is a large dark box in the top-right corner and is not the
  product. `after-99` is a frame of it, with the stub lifted.
- **The achievement toast.** `MOCK_NODE_STATES` carries two mastered skills — which is what
  makes the roster and the City life panel read as a real city — and the achievement layer
  notices that on load and pops *"You took a skill all the way to mastery"* across the water.
  True, not what these frames are of, and not something a first-run learner has earned.

## Before

| File | What it is |
| --- | --- |
| `before-01-demo-reel-1024x580.png` | The framed `DemoReel`, which first-run onboarding opened with two rewrites ago. Live code, reached through `☰ Menu → How to play → Watch the intro again`. |
| `before-02-coach-mark-place-1024x580.png` | The `place` coach-mark over the live HUD. Still live: it is what a learner who SKIPS gets. A 258px dark chip in a corner saying *"Drag a building onto an open plot."* |
| `before-03-old-moment-island-1024x580.png` | **The screen the product lead reviewed.** Three bullets under a heading, opening *"Sire! The island is yours. Bare ground today, and a city by the time we are done."* |
| `before-04-old-moment-buildings-1024x580.png` | Its second slide, *"How a building goes up"*, three more bullets. |
| `before-05-old-moment-stockpile-1024x580.png` | Its third and last. |

## ⚑ Oru is the advisor. He is not the Chronicler

Settled by the product lead in those words on 2026-08-04, and `after-01` is the frame it
changed. The intro used to open *"I am Oru, and I keep the city's memory."* Keeping the city's
memory is the **Chronicler's** job, which is a separate shipped feature — the Album,
#514, which records what the city
looked like at each age. The first screen was telling a learner Oru was one thing while the
product built another.

The opening frame now carries the three things the ruling says an advisor does: *"Oru, your
advisor, at your service! I will show you how to build a city here."* over *"This bare island
is yours. I point things out as we go, and I speak up when you need me."* The whole briefing is
swept for the Chronicler's vocabulary rather than for that one sentence, in both directions,
because the framing recurs.

**It recurred in the persona registry, and that half is now closed by somebody else.** These
frames reported it: `eraDressing.ts` gave era one's advisor `role: "the memory-keeper"` and two
live surfaces printed it, on the era-advance ceremony's byline and the era door's eyebrow.
#619 retired it, merged
2026-08-05T03:08:24Z, and the registry reads `role: "your advisor"` at this tip. The sequence
and the registry agree.

## After: one frame per slide

| File | What the slide teaches | What it rings |
| --- | --- | --- |
| `after-01-moment-advisor` | Who is talking, that he is glad of it, and where they are standing | nothing: he is introducing himself |
| `after-02-moment-buildings` | A building is one math skill, and working the skill earns it | the **Build** pill |
| `after-03-moment-place` | Their turn, on the real island, and the gate | the **Build** pill, and the stage stands down |
| `after-04-moment-lessons` | Open a building to start its lesson | the **Buildings** chip |
| `after-05-moment-resources` | Practice grows mastery and pays stone, which is the age's resource | the **Stone** counter |
| `after-06-moment-population` | People move in as the city grows | the **Population** row |
| `after-07-moment-livability` | How many people the city can look after | the **Livability** row |
| `after-08-moment-happiness` | How many people have something to enjoy | the **Happiness** row |
| `after-09-moment-civic` | Stone is spent on civic buildings and roads | the **Build** pill |
| `after-10-moment-era` | Master every skill and the age ends | the **Buildings** chip |
| `after-11-place-01-your-turn` | the stood-down panel, the ringed pill and the whole island in view | |
| `after-11-place-02-build-menu` | the real Build menu, opened by pressing the real pill | |
| `after-11-place-03-aiming` | **a real ghost on the real island with the real confirm bar** | |
| `after-11-place-04-placed` | the building down, the gate open, and him back at full size | |
| `after-13-gate-held` | Next pressed too early, and the way past it | |
| `after-99-dev-replay` | the dev control over the live city | |

## ⚑ The placement is the city's own now, and `after-11-place-03` is the frame for it

The lead: *"they should actually have to place the building and not just drag a house into a
2d box like what is the point of that bro."* The board he was looking at was two 62px tiles
inside the speech bubble, and it existed because of the stage: `AdvisorStage` is an
`aria-modal` layer over the whole viewport, so the island underneath could not be clicked.

That is fixed at the layer. On the gated moment the stage stands down — `role="group"`, no
`aria-modal`, no focus trap, pointer-transparent — and shrinks into the bottom-left corner. The
learner presses the real Build pill, chooses a real card, and confirms on the real bar; the
gate opens on `CitySurface`'s own placement count and on nothing else.

Three things in `after-11-place-03` are the evidence, and none of them is the panel:

- **the ghost on the island**, which is `CityScene`'s, not a picture of one;
- **the confirm bar reading `PLACING · VALID · 0 DEGREES` / Assembly Hall / Cancel / Rotate /
  Build here**, which is `PlacementBar`, the same one every placement in the game uses;
- **the two of them side by side with the island around both**, which is what says the panel is
  not covering the thing it is telling the learner to use. That disjointness is an always-on
  assertion in the shots suite, in the boxes' own numbers, because it was not true on the first
  try: lifting the bar straight up left it at y 248-348 under a bubble at y 292-563, and it
  took moving the bar sideways instead.

## The numbers, from `measured-1024x580.txt`

| | Figure | Share of the window |
| --- | --- | --- |
| The reel's caption advisor | 56x56px | 0.5% |
| The `place` tooltip (the whole tooltip) | 258x88px | 3.8% |
| The crisis advisor, the register asked for | 255x255px | 11.0% |
| **The onboarding advisor** | **255x255px** | **11.0%** |

And the spotlight, which is the measurement worth reading twice:

```
the Build pill: 129x57px at x=879, y=507, with the bubble ending at x=916
the ring round it: 141x69px at x=873, y=501
painted at the pill's middle: rgb(253, 248, 235) unlit, rgb(242, 195, 83) lit,
  against rgb(243, 195, 83) at the end of the pill the bubble never reaches
```

**Read the third line, because it is the whole argument for the spotlight being more than a
`box-shadow`.** The advisor's bubble runs to x=916 and the Build pill starts at x=879, so the
bubble covers the pill's leading 37px. Unlit, the pixel painted 18px into the pill is
`rgb(253, 248, 235)`, which is the bubble's cream. Lit, the same pixel is `rgb(242, 195, 83)`,
which is within one unit of the pill's own gold read from the end of the pill the bubble never
reaches. The control is genuinely in front, in the composited frame, not merely given a higher
z-index in a stylesheet.

That reading is an always-on assertion rather than a note, with a permanent negative control
(the moment before, same viewport, same bubble, no lift, and the two points must disagree).
Forcing the lift off takes it red at *"lit, the middle of the pill paints rgb(253, 248, 235)
against rgb(242, 195, 82) at its clear end, so the bubble is still in front of it"*.

## An honest read of the frames

Where I think it is genuinely strong:

- **`after-11-place-03` is the frame that answers the review.** A learner is aiming a real
  Assembly Hall at a real cell with the real bar under it, and the advisor is beside them
  rather than on top of them. Nothing about it is a rehearsal.
- **The rings are unambiguous.** On `after-08` the ring is round the Happiness row and the
  words inside the ring are *"Your people are unhappy!"*, which is the exact sentence the slide
  teaches them to read. That is still the best frame in the set.
- **The gate does not read as a wall.** On `after-13` the greyed Next, the amber line saying
  what is owed, and "Place one for me" sitting beside Skip are all in one glance.
- **The opening reads like somebody who is pleased you have arrived.** *"Oru, your advisor, at
  your service! I will show you how to build a city here."* against the retired *"I am Oru,
  your advisor. I will show you how to play."* Same facts, same reading level, one of them said
  by a person.

Where I would not defend it:

- **The stood-down panel is tight, and it is tight by measurement rather than by taste.**
  `.crisis-call-slide` scrolls rather than spills, so a panel with more content than corner
  clips itself in the middle with nothing saying so — which is exactly what the first version
  of `after-11-place-01` showed, with the shortcut button and the whole status line below the
  fold. Two lines come off that frame to make it fit: the byline, and the moment's second
  sentence, which the learner reads on the frame after instead. It is a real cut.
- **The advisor's arm still crosses the Buildings chip** on the frames where the dock is not
  lifted. That is `crisisCall.css`'s geometry, shared with the crisis, and diverging the
  onboarding assembly from it would be inventing a second advisor by a different route.
- **`after-10-moment-era` rings the Buildings chip rather than the Town Hall.** The hall is the
  chapter marker the trial is taken at and would be the better referent; its anchor resolves to
  a roster entry inside a collapsed disclosure, so the ring simply did not draw. The
  measurements file said so in as many words on the previous run.
- **Ten dots at 1024px are small**, and they are hidden altogether on the stood-down frame.
  *"Step 3 of 10"* in words is what carries the position.

### Does any slide fail to earn its place?

The island slide is gone: it said the island was your city and that math built it, and the
buildings slide said the second half of that immediately afterwards. Its first half moved into
the opening sentence (*"This bare island is yours"*) and the room went to the age, which the
sequence did not mention at all.

Everything else carries a mechanic that nothing else in the sequence says: population,
livability and happiness are three different numbers in one panel, and a learner who is shown
one of the three learns to ignore the other two.

## What is out of scope here

The advisor's persona and his costume are Evan's lane (`docs/Content_Authoring_Split.md`
§1.1). These frames photograph what exists, in era one's dress, because a brand-new learner is
standing in era one. A frame that reveals a costume problem is reported, not fixed.
