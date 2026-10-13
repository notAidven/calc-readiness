# The Succession — era four's crisis, photographed with the renderer that ships it

> **⚑ RE-TAKEN 2026-08-04, after the play-test.** The lead played this at `?succession` and it
> did not hold up: *"need a lot more instructions in the advisor pop up style as before - also
> there's some floating elements that are just drifting. it also needs to be spread out a lot
> more and not all cramped into this little batch. trees also look bad and nothing is really
> clear"*. Every numbered frame below is the board AFTER that pass, and
> `output/succession-forum/` holds the matched before-and-after pair at 1024x580 and at the
> window the lead's own screenshot was taken on.
>
> Two of this file's own *"what does not read"* entries were the defect he was describing, and
> both are answered: the foreground is no longer empty, and the arc is no longer a batch. See
> **What the play-test changed** below.

Sixteen frames of the board, plus five of the advisor, all at **1024x580**, all under
**reduced motion**, taken by
`apps/web/src/city/three/successionCrisisAtlas.browser.test.tsx` against the real engine
(`engines/game/src/succession.ts`) and the real procedural geometry
(`apps/web/src/city/three/successionScene.ts`).

    VITE_SUCCESSION_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
      apps/web/src/city/three/successionCrisisAtlas.browser.test.tsx

Off in CI. Everything above the frames in that file — the population sweep and the
distinctness census — runs on every push.

## What these are, and what they are not

**They are not the nineteen reference frames.** `output/imagegen/era-04-succession-crisis-scenes/`
holds those, and its own header says what they are: *"Treat these renders as the first draft of
the design rather than as pictures of it"*, commissioned when nothing in the tree drew a plinth.
They were read as a description of a shape and **never loaded** — the game ships procedural
geometry and `.glb` models and reaches no generated image anywhere.

**The viewport is half the evidence.** `.cursor/rules/qa-verification.mdc`: a spatial claim owes
a rendered frame somebody looked at, taken at a short realistic viewport, with the viewport named
beside it. Every frame here is 1024x580 — the lead's own window — and every filename says so. A
frame at a comfortable developer viewport would be exactly as misleading as arithmetic, and
misleading for the same reason: it would look fine.

**Nothing is cropped to its subject.** Every frame is the whole viewport. The `-screen-` frames
carry the crisis panel, so how much forum is actually left is part of the evidence rather than
something to crop out; the `-forum-` frames drop the panel and get closer only through the
player's own zoom button at the shipped locked tilt.

## The frames

Two per state: the real screen, then the forum alone driven in to the district the state is
about. The states are `successionScenarios.ts`'s, every one of them played through the reducer
rather than forged.

| # | Frame | What it shows |
| --- | --- | --- |
| 01 | `01-neutral-screen` | The opening board. Every district neutral, no block anywhere, and the rail reading *"No district decides next cycle."* |
| 02 | `02-neutral-forum` | A bare plinth: finished stonework, nothing at its foot. A positive state, not a figure that failed to draw. |
| 03 | `03-warned-screen` | One cycle answered. Three counters banked and the drift line naming the harbour district and the claimant it would go to. |
| 04 | `04-warned-forum` | The warning as an object: shear-legs straddling the plinth, the sling hanging slack, and the block at the foot cut with a chevron. |
| 05 | `05-planned-screen` | A sway in the plan and not yet paid for. The ledger reads the outcome, then the sum, then the leftover, then what still drifts. |
| 06 | `06-planned-forum` | The proposal: the same figure, see-through, standing in its exact committed place over a plinth that is still bare. |
| 07 | `07-drifted-screen` | Two cycles, nothing spent. The harbour decided on its own and its Grain Dock is shuttered. |
| 08 | `08-drifted-forum` | The block became the figure. The hoist is down and a statue stands where the block was waiting. |
| 09 | `09-secured-screen` | The contest settled for two counters. |
| 10 | `10-secured-forum` | The shutters off and a marble plate on the wall. |
| 11 | `11-suspended-screen` | The long board, four cycles of hesitating: three civic buildings shuttered at once. |
| 12 | `12-suspended-forum` | Era four's whole durable consequence, accumulating. Boarded bays, corner markers, and every outline intact. |
| 13 | `13-favourable-screen` | Settled, favourable. Everything earned was spent and nothing is forfeited. |
| 14 | `14-favourable-forum` | Statues over a forum with no contest left standing. |
| 15 | `15-mixed-screen` | Settled, mixed. Nothing decided by the player, twelve counters forfeited, three buildings still in dispute. |
| 16 | `16-mixed-forum` | One claimant's statues on every plinth, and every building boarded. |

## The advisor

Five more, from `apps/web/src/succession/successionAdvisorFits.browser.test.tsx`, which also
asserts on every run that no slide is cut off at 1024x580 or 1440x900.

| Frame | What it shows |
| --- | --- |
| `advisor-01-dispute` | The shout, and what is being disputed: two claimants, one district a cycle, and a district that decides stays decided. |
| `advisor-02-cycle` | The rule the board's readability rests on. A cycle turns on an answered batch and on nothing else, so planning moves nothing. |
| `advisor-03-warning` | The block at the plinth, a cycle before that district decides, and the fairness property: one perfect batch mints exactly what answering it costs. |
| `advisor-04-influence` | The three verbs, priced, so a player can compare them against a bank counted in the same object. |
| `advisor-05-waiting` | What a shuttered building costs while it waits, and that the bank is forfeited at the settle. |

## What the play-test changed

- **Four objects were in the sky.** The three hulls at anchor were seated at `y: -0.2` over a
  harbour drawn at `-1.4` in a different file, so each stood 0.95 clear of its own water, and the
  furthest was at `z -41` over water that stopped at `-39`. The crane carried the quay deck's
  height while standing two and a half units in front of that deck. `successionNothingFloats.test.ts`
  raycasts the drawn surfaces now rather than restating them, and caught a fifth: the island's own
  underside stopped 0.3 above the sea.
- **The arc was narrowed to fit the canvas, and the canvas should have been fitted to the arc.**
  Six buildings 5.75 across shared 37 units of frontage — 1.6 of paving between neighbours. The
  frame is fitted to the forum now (`forumFraming.ts`, the city's own `setViewOffset` mechanism),
  so the arrangement is sized by what it needs: **4.2** between neighbours, and the share of the
  disc with anything within a few paces of it goes from **54% to 97%**.
- **The trees were tents.** The crown's skirt came to 1.95 over a 2.1 trunk, so no stem showed at
  all and a six-sided cone is a tent. Limbed up to 2.35, three overlapping flattened icosahedra in
  the island's own two canopy tones, set out in two staggered rows as the era's guide asks.
- **Nothing explained itself.** The advisor above.

## An honest read

**What works.**

- **The drift line does its job.** In `03` it is the first thing on the panel, it names the
  district and the claimant, and the district it names is at the top of the board with a marked
  left edge. It is a full cycle ahead of the decision every time — swept over every authored
  board at every rung of the ladder in `successionView.test.ts`, not just in these frames.
- **The two claimant marks read as cut stone.** The chevrons on the boundary stones in `12` and
  `14` are legible at the shipped camera and are plainly grooves rather than drawn lines.
- **Shuttered reads as shuttered and not as sacked**, which is the confusion the art brief calls
  this era's costliest. In `12` the boarded buildings have kept every line of their outline: no
  collapse, no fallen column, no gap in a roofline.
- **The port carries the atmosphere.** The treadwheel crane stopped mid-lift with its block in
  the air is doing more work than any single object on the board, and it is in frame on every
  screen shot.
- **The panel fits.** Both actions, the whole district list and the rail are on screen at 580px
  tall, which took a narrower panel and a title that does not wrap.

**What does not read, stated plainly.**

- **The boundary stones are still the weakest thing in the picture.** They read as a scatter of
  pale cubes more than as four or six enclosures, and on the six-district board in `12` they
  crowd the floor. Three things were changed for this and the last of them helped least: the
  count came down from twelve a district to eight, they were sunk into the paving so they read as
  set rather than dropped, and the enclosure was tightened onto the plinth and capped so two runs
  cannot overlap. What is left is a legibility problem rather than a correctness one — nothing
  fills a district and nothing joins two, which is what M5 owes — but a reviewer looking for
  *"which ground is whose"* will not get it at a glance.
- ~~**The forum's foreground is empty.** The arc sits in the upper half of the frame and the
  bottom third is unmarked paving in most `-forum-` frames. The basin is the only thing in it.~~

  **ANSWERED 2026-08-04, and it was the lead's own complaint arriving here first.** This entry
  and *"cramped into this little batch"* are one observation. The disc came in from 30 to 25, the
  arc widened from 101 degrees to 156, the port moved to the shoreline behind it, the basin moved
  into the open square and an avenue of trees runs round the open side. Measured on the six-ward
  board: the share of the disc with something within four units of it goes from **54% to 97%**,
  and `forumFraming.test.ts` holds a floor under it with the old arrangement as its control.
- **The drift block and a boundary stone are the same object at a distance.** They separate on
  size (1.55 against 1.02) and on the block being at a plinth's foot, and in `04` you can tell
  them apart — but only because you know where to look. The block is the object this whole crisis
  is watched through and it deserves to be more distinct than it is.

  **Partly addressed since, and the frames here are the BEFORE.** The accepted ruling stands the
  block 0.55 clear of the plinth rather than 0.35, so its cast shadow falls on paving instead of
  merging into the plinth's — `docs/design-refs/era4-rulings/` carries the matched pair. Read at
  that pair: the improvement is real and it is a few pixels, and what actually crowds the block
  turned out to be the boundary run around it rather than the plinth beside it. So this
  observation is now less true and is not yet untrue.
- **The proposal is faint.** `06`'s ghost is legible after being taken to 0.7 opacity and 55% of
  the stone's value, and it is still the least emphatic thing on that frame. Era four's stone is
  the palest in the run and this is the cost of it.

  **And a planned CANCEL said nothing at all here, which these frames do not show because they do
  not photograph one.** A cancel's result is a subtraction and it was drawn as an added ghost of
  the building it would become, laid over the contested one — so the shutters it takes away were
  still standing solid underneath a doubled mass. The accepted removal grammar fixes it and
  `docs/design-refs/era4-rulings/` photographs the pair.
- **The figures read as masses rather than as people**, which is correct for the era's low-poly
  language and is worth saying anyway: the standing/seated separation works at this camera
  because of the raised arm and the knee overhang, and it would not survive them being trimmed.
- **The planning mode does not fit in 580px.** In `05` the counting slab and the first card are
  at the bottom edge and the ledger — the panel the whole two-mode design turns on — is below
  the fold. The panel scrolls, so nothing is unreachable, but a player deciding whether to hold
  or spend has to scroll to see the leftover, which is the number that decision turns on. The
  board list is what would have to give: four districts at three lines each is most of the
  budget, and collapsing a district that is doing nothing is the obvious next move.

## Related

- `apps/web/src/succession/` — the surface, the projection, the layout and the scenarios
- `apps/web/src/city/three/successionScene.ts` — the geometry
- `apps/web/src/city/three/successionTones.ts` — the palette and the registered atmosphere
- `output/imagegen/era-04-succession-crisis-scenes/` — the reference frames, read and never loaded
- `docs/design-refs/hard-winter-crisis/` — era one's atlas, which this follows
