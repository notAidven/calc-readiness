# The test-out catch-up, walked end to end

> **⚑ SUPERSEDED IN PART ON 2026-08-04, AND THE FRAMES ARE REGENERATED.** The lead looked at a
> running build and ruled twice on this surface: *"this UI looks terrible; clean it up. it makes
> no sense to the user"*, and *"the beats are a little too long for the diagnostic seeding."* So
> **the three roads are two**, the build mode follows D-ERA18 instead of being asked per age, and
> **every founding after the first is a recap**. `docs/design-refs/catch-up-compression/README.md`
> is the record of that change and has the before-and-after timings; the frames here are current
> and every read below has been re-taken against them. What is UNCHANGED is everything about the
> founding's own picture, the dev hatch, and the loop's shape.

**Frames taken at 1024x580 under reduced motion, on the real city with its real canvas, by
`apps/web/src/catchup/catchUpShots.browser.test.tsx`.** Regenerate with

```
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/catchup/catchUpShots.browser.test.tsx
```

The same frames are copied to `output/catch-up-*.png`. Every one is clipped to the **whole
window** rather than to the surface, for the reason `.cursor/rules/qa-verification.mdc` gives:
cropped to the element that changed, a screenshot proves nothing about occlusion, because the
element is the one part of the picture nobody doubted.

## How to reach it yourself

`npm run dev` and take the **Enter the catch-up** hatch in the top-left corner
(`07-dev-hatch.png`). Pick the age you want to be placed in on the first row, then the age you
want to start the walk at on the second. It writes a real `placement_by_node` and hands it to the
real reader, so a dev jump reaches the same conjunction over the same evidence as a real pretest,
and the same two presses give byte-identical input every time.

The hatch is `isDevEraSkipEnabled`-gated (`DEV && MODE !== "test"`) and the call site is a literal
`import.meta.env.DEV`, so a production build folds the branch and tree-shakes the module.

No backend is needed on this path: `createCityDevSession` is the in-memory session and
`createInMemoryDiagnosticClient` is the in-memory walk. Nothing here touches Aurora.

## What is in each frame, and an honest read of it

### `01-two-roads-tier-one.png` — the stop prompt, closed

`AGE 1 OF THE 4 YOU TESTED OUT OF`, the era name, what the age is about, the sentence that says
the city is walking forward through the ages, the closed disclosure, and **two roads stacked with
the trade each one makes written under it**.

**Read:** the card now answers the question it is asking. Two peers rather than two-plus-an-escape
means the visual weighting stops saying *"these two are the options and that one is the way out"*,
which is the wrong story about the only road that changes what the learner will be asked to learn.
The consequence lines are the biggest single improvement: the forfeit used to be a grey footnote
under both buttons and is now the sentence attached to the button that causes it.

**And the well got SHORTER despite gaining two lines**, which is worth recording because it went
the other way first. Two consequence lines cost two rows, and the frame that bought them measured
the whole card at its 420px ceiling with the footer clipped at the window's edge. The cause was
not the rows: every paragraph in the well was carrying the user agent's own 1em block margin,
because nothing in the stylesheet zeroed it and only `.catchup-title` set `margin: 0`. Zeroing it
takes the closed card to about **305px with about 258px of island above it and the Town Hall in
frame**, against the 350px the three-road shape measured.

### `02-two-roads-tier-two-open.png` — the disclosure open

`What this age covers` opened in place: the era's summary in full, `THE SIX SKILLS`, and the
first title, with a hairline above the roads and the rest of the list scrollable.

**Read, and this one is a qualified pass.** The panel grows to about 500px when opened, which
leaves about 55px of island, and that is a real trade — taken deliberately, because tier two is
opt-in and momentary and a learner who asked for the information should be able to read it. The
weakness is the scroll affordance: the list is clipped mid-glyph under the hairline, which reads
as *"more below"* to me but is not as loud as a visible scrollbar, and Chromium's overlay
scrollbars do not paint until the panel is scrolled. **If one thing on this surface gets a second
look before Friday, it is this.** The first version of the panel was worse and is worth recording:
at the closed ceiling the fixed rows left about 68px for tier two, so the summary was cut off
**mid-word** with the buttons immediately under it, which reads as truncated copy rather than as a
scroll.

### `03-the-first-age-by-hand.png` — the age D-ERA18 gives the learner

The strip after `Keep going` at the FIRST age: `0 of 6 standing. Open the build menu to place the
rest.` and one action to carry on. The island is completely clear.

**Read:** this is the one place the surface has to get out of the way, and it does. Nothing was
auto-seated (`data-standing="0"`, asserted), the build menu and the grid are the city's own and
untouched, and the strip counts rather than gates. A learner who seats four of five and wants the
ceremony can have it, because a gate here would be the only place in the game where a layout
choice blocks progression.

**What changed on 2026-08-04 is who reaches this screen and when.** It used to be a road the
learner chose at every age; it is now where D-ERA18 puts the hand-placing, which is the first age
and only the first age — *"the agency and the teaching both land the first time; repeating them is
repetition rather than learning."*

### `04-founding-mid-beat.png` — the four beats, replayed without questions

Beat one, mid-gather. The whole island is in frame, the citizens are walking in, **the Town Hall
is scaffolded** (beat one's own change), and the caption is a small pill: `PREHISTORIC ERA / The
city gathers`, with the four-track rail under it showing beat one partly filled.

**Read: this is the best frame of the set and the feature's strongest moment.** There is no
advisor and no bubble, which is §10.17's silence, and the result is that the city is the whole
picture. No answer field, no `Check`, no question (asserted, not just photographed). The caption
is about a fifth of the height the stop prompt takes, which is the right proportion for something
you are meant to be watching rather than reading.

### `05-forfeit-at-the-first-age.png` — the forfeit

The same prompt, with `You work through its six lessons, and the Neolithic Era, the Bronze Age and
the Classical Era come with it.` under the stop road — a fact on the way past rather than a price
in front, and absent entirely at the last handed age.

**Read:** it names three ages without naming a cost, a miss or a should, and it now sits where the
lead said it belongs. It wraps to two lines at 1024px, which is the price of moving it out of the
footer and is worth paying: a sentence under the button that causes it is read as part of the
decision, where the same sentence under both buttons read as a non sequitur.

### `06-stopped-at-the-first-age.png` — the road that changes progression state

`The Prehistoric Era is yours to build.` with the concept line, `Six skills, six lessons.` and
one action.

**Read:** the advisor's line belongs here and is deliberately not written (**O-TX19** owns it:
these are the first words a character says to this learner and they want the care D-END5's line
got). So this screen states the fact and hands over, and the character's line is a slot with an
owner rather than a guess with a byline. It reads a little bare because of that, which is the
honest state rather than a finished one.

### `07-dev-hatch.png` — the hatch

All ten eras on the first row, the walk positions the chosen placement admits on the second, and
one line saying what it writes. Dark, mono, square corners against a pale rounded surface, so a
reviewer can tell in one look that it is not part of the product.

**Read:** it covers the city-life panel's corner, which is the cheapest corner to spend, and it
folds to a chip before you photograph anything. The era names wrap awkwardly
(`PREHISTO RIC ERA`) at five columns; legible, and not worth a row of vertical space to fix.

## The loop's measured length

`apps/web/src/catchup/catchUpLength.test.ts` prints this table. **Two of the three rates in it
are invented and are §10.18's and §10.13's own, reused unchanged so these figures are comparable
with that record's rather than better-looking than them:** 15 seconds to read a prompt, 40 seconds
for the learner to seat one building. The founding term is **the shipped clock**, which is what is
new here — that record assumed a flat `T`.

```
                  handed  buildings   beats  prompts   CITY-PLACES   I-PLACE
neolithic              1          6   0.8min  0.3min       1.0min     5.0min
bronze_age             2         11   1.5min  0.5min       2.0min     9.4min
classical              3         16   2.4min  0.8min       3.2min    13.9min
medieval               4         21   3.4min  1.0min       4.4min    18.4min
renaissance            5         26   4.4min  1.3min       5.6min    22.9min
industrial             6         32   5.3min  1.5min       6.8min    28.1min
atomic_age             7         38   6.3min  1.8min       8.0min    33.4min
information_age        8         47   7.2min  2.0min       9.2min    40.6min
cyberpunk              9         53   8.2min  2.3min      10.4min    45.8min
```

**The brief asked whether five ceremonies is a lot of ceremony. Measured, it is not the problem:
the placements are.** A learner placed in era six walks five ages in **5.6 minutes** if the city
places for them, and **22.9 minutes** if they place all 26 buildings by hand. The worst case in
the whole product is nine ages hand-placed at **45.8 minutes**, and every second of the difference
is 40 seconds a building.

That reproduces §8.4's conclusion — *"the placements were always the cost"* — against the shipped
clock rather than an assumption, and it is the argument for §10.10's D-ERA18 default.

**⚑ THE `I-PLACE` COLUMN IS NOW UNREACHABLE, AND THAT IS THE 2026-08-04 CHANGE.** This table was
printed while the surface offered a per-age build mode, so a learner could land anywhere in the
range. Under D-ERA18 the first age is hand-placed and every later one is the city's, so the walk
is the `CITY-PLACES` column plus one age's worth of hand placement, and the 45.8-minute worst case
is gone. The `beats` column has moved too: it is the FULL founding at every age here, where the
first is now full and the rest are 14-second recaps. Both are re-measured in
`docs/design-refs/catch-up-compression/README.md` against a running dev server rather than against
this table's invented rates.

## What is not fixed, in the order I would fix it

1. **The auto-layout runs out of island, and it now takes longer to.** Measured at `54cac8d6` a
   four-age roster of 21 seats 18 and leaves 3. Under D-ERA18 the layout no longer seats era one's
   six at all, so a four-age walk asks the disc for 15 and every one of them seats;
   `catchUpFlow.test.ts` re-measures it and the reporting path is still exercised at a nine-age
   walk, which still overruns. The rest of this entry stands. Every roster seats in **full** at its own era's
   authored radius, up to 62 of 62 at era ten, which is what says this is the disc rather than the
   layout. `isCellBuildable` closes over
   `BUILDABLE_RADIUS`, so the placement disc stays on era one's 88 cells however far beat two
   grows the drawn land. The shortfall is **reported** through the live region and the leftovers
   keep their build-menu cards, so nothing is silently missing, but a demo driven at a placement
   of era six or later will show a city short of buildings. **Demo at era 2, 3 or 4 and it does
   not arise.** The fix is the one `worldLayout.ts` already names — make the disc era-driven and
   delete `eraCityLand.test.ts`'s TRIPWIRE — and it is **O-TX4**'s land dependency rather than
   this surface's.
2. **Tier two's scroll affordance**, above.
3. **The advisor's two lines** (**O-TX19**), which is copy with an owner.
