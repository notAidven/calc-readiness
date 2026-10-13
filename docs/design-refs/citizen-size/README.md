# Citizen size, photographed at 1024x580

Rendered by `apps/web/src/city/three/citizenSizeShots.browser.test.tsx`, which is off by
default:

```
VITE_CITIZEN_SIZE_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/citizenSizeShots.browser.test.tsx
```

**Viewport: 1024x580, under `prefers-reduced-motion`, the lead's own window.** Every figure
below is quoted at that viewport, because a perspective camera's vertical frustum is a fixed
angle and a frame taken at a comfortable developer viewport is exactly as misleading as
arithmetic. The same frames were taken twice, once per era, and the identical set of numbers
came back — the island is grass 30 in both, because #437's per-era land growth is not merged.

## What the ruling was, and what these frames are evidence for

> *"why are there groups of citizens at different sizes? they should all be the same size bro.
> the crowd coming into gather doesn't mean they all become giant sized - they can just retain
> their initial size and just come in to the center to watch."*

So there is one figure — **1.30 world units, half the Dwellings' rendered height** — and the
gathering changes position only. The cost of that is visibility: at the frame the island
ships in, 1.30u reads **7.8 CSS pixels** foot to crown, which is genuinely hard to see. It is
bought back by the CAMERA (`three/ceremonyFraming.ts`), which changes no world scale at all.

Read off the live camera at each frame, not inferred from the picture:

| state | view offset the scene applied | a person, foot to crown |
|---|---|---|
| `buildings`, `everyday` | 1.5209x (the island's own frame) | 7.8px |
| the three `gathered` frames | 0.5139x (the ceremony's lens) | **23.0px** |

**The lens stops exactly at the bar.** 23px is the size the original ruling's own arithmetic
implies a citizen has to reach, and `LEGIBLE_PERSON_PX` is a CEILING on the close-in measured
against it: fitted to the crowd and the hall alone the beat asks for 0.3750 and a **31.5px**
citizen, 37% past the bar, and a lens magnifies *everything* — so those 8.5 pixels were being
charged to the mastery rack and to the shore. Nothing about a WORLD size is derived from 23; it
is a screen limit on a screen quantity, and both sides are re-measured through whatever camera
the scene has.

## The frames

| file | what it is |
|---|---|
| `<era>-buildings-1024x580.png` | the settlement, nobody on it. The reference, and what a figure has to read against |
| `<era>-everyday-1024x580.png` | the ordinary city: its own crowd at their doorsteps, at the resting frame |
| `<era>-gathered-1024x580.png` | **exactly what ships during beat one** |
| `<era>-gathered-crowd-only-1024x580.png` | the same frame with the everyday roster withheld at the call site. A CONTROL now: it must be the same picture |
| `<era>-gathered-nobody-1024x580.png` | the same frame again with the crowd's instance scale at 1e-4 — the reference the crowd's silhouette is differenced against |
| `measured-<era>-1024x580.txt` | the numbers each frame was measured at |

`prehistoric` is era one, whose art, ground palette and citizen cloth are all authored.
`classical` is era four, where **none of the three is** — `islandGround` and `citizenDress`
both fall back, so the ground is `#9A9184` and the everyday crowd's cloth is `#6E675C`. That
is what a learner in era four sees today.

## AN HONEST READ OF THEM

**What works.** The gathering reads as a gathering. Forty-four separable figures, massed on
one side of the hall, pale linen over reddish cloth against era one's tussock green and era
four's grey fallback alike — and the differencing instrument agrees with the eye: **44
separably-connected masses for a 44-person crowd**, at 311px of area each against 41px at the
resting frame. Nothing else in the frame competes with them: the mastery racks and the skill
labels both stand down (below), so the picture is the settlement, the crowd, and the shore.

The crowd also **clears the advisor**, which is the thing the centring put at risk. Its lowest
foot is y 227 against an assembly whose top edge is measured at y 307.4.

**Five things to say plainly, and the last three are not fixed.**

1. **The crowd is closer, and it is not "in the plaza".** It stands **11.6u to 21.5u** from the
   hall, against 15.5u to 25.0u before, so its front rank is now inside the ring of six plots
   (6.3u to 10.8u out) instead of 4.7u past the furthest of them. But the ranks step OUTWARD and
   only 7 of 44 people are in the front one, so on screen the mass reads as *the citizens have
   gathered on the common above the town* rather than *in the square*. That is as far in as the
   settlement leaves room for: over all 720 orderings the placer can be handed, the first reach
   at which no ordering puts a citizen inside a plot is 15 — so the reach that shipped was very
   nearly the minimum a 44-person wedge needs, and coming in at all required `clearOfPlots`,
   which steps anybody in a wall radially out. At a reach of 7 (the naive reading of *"the
   centre"*), **nine of forty-four stand inside a building**.

2. **A citizen at 23px reads as a figure, not as a person.** The bar is met exactly and the
   silhouette carries — head, body, hem, and a mass that is clearly a crowd of individuals — but
   at this size a citizen reads closer to a chess pawn than to somebody watching a ceremony.
   The bar is the ruling's own number and the lens lands on it by construction; whether 23 is
   the right bar is a separate question from whether it is met, and this is the frame to ask it
   on.

3. **⚑ NOT FIXED: at gather 1 the crowd does not face the hall.** `crowdInstanceMatrix` takes
   its facing from `atan2(to.x - at.x, to.z - at.z)`, and at the end of the beat `at === to`, so
   `atan2(0, 0)` is 0 and the whole crowd faces +Z. `CeremonyLayer.tsx`'s own docblock says
   *"everyone faces the hall, which is what turns a scatter of people into an audience"*, and at
   the end of beat one that is not what happens. It is invisible at 23px on these frames and it
   predates this work; it is recorded rather than repaired because the fix is a facing term
   somebody should design rather than a line to slip in.

4. **⚑ NOT FIXED: era four's EVERYDAY crowd is still effectively invisible.** Compare
   `classical-everyday` against `classical-buildings`: 1,791 pixels of `#6E675C` cloth on
   `#9A9184` ground, a contrast ratio of **1.80:1**, at 7.8px. Era one's is barely better —
   1,828 pixels of authored hide-brown on tussock green, about 7.8px of figure, reading as
   pebbles among the island's own scatter of stumps and boulders. **Colour, not size, is the
   legibility lever here**: at the same 1.30u in the same frame the ceremony crowd's linen ramp
   reads as clothed people while era one's authored hide reads as fence posts. Centring the
   crowd changes neither, because both findings are about the crowd at the RESTING frame, which
   this work does not touch.

5. **⚑ UNPHOTOGRAPHED: the orbited headings.** These frames are the default heading only. The
   arithmetic (`ceremonyLens.test.ts`, over a real projection) says a quarter turn puts a
   citizen at 20.6px, 21.7px or 21.2px against the 23px bar, and puts the crowd's lowest rank
   **behind the advisor's bubble** at all three — the box is taller than the strip he leaves,
   and no amount of zoom fixes it because a tighter frame magnifies the box. Nobody has looked
   at a rendered frame of that, so it is a measured claim and not a seen one.

## What the ceremony's own frame no longer contains, and why

Two things were standing in it and both are gone during beat one:

- **the mastery racks** (`PlacedBuilding`'s `standDown`). They are world-space billboards, so
  the lens magnifies them — 2.96x with the ceiling in place, and it would be 4.06x without. The
  ceiling helped and did not settle it, because a lens is scale-invariant: one star is **2.19x a
  citizen's height at every zoom the beat can reach**, so no framing constant can make the rack
  quieter relative to the people. A row of three was 151px wide over each of seven buildings
  against a 23px citizen;
- **the skill labels**. Found by looking at the frames after the racks came off: the lens does
  not magnify a label (the type is CSS) but it spreads the six of them across the whole picture,
  and *"Fractions"* landed in the middle of the gathering with *"Simplifying & combining like
  terms"* across its back rank. Gold over a hall is one thing; words over the people the beat is
  about is another.

Both are scoped to a staged ceremony crowd, so `*-everyday-*.png` and `*-buildings-*.png` still
carry their racks and labels — which is what those two frames are the control for.

## What these frames do not show

The hall is drawn `built` here; during a real beat one it carries beat one's scaffolding
(`hallStage: "construction"`). The advisor and his bubble are NOT mounted — this file
photographs the island, and an opaque bubble over the thing under review would be the wrong
evidence — so his band appears here only as the line at y 307.4 the crowd is required to stay
above; `apps/web/src/city/advisorBandOverTheIsland.browser.test.tsx` measures the real assembly.
And nothing here is a claim about motion: under reduced motion the everyday crowd is posed at
the resting end of its beat and the ceremony crowd is where the learner's answers have put it,
which is the whole picture either way — the beat is a pure function of progress and never of a
clock.
