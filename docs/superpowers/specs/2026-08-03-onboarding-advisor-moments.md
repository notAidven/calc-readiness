# First-run onboarding as advisor moments

**Status:** landed. **Owner:** the city lane (`OWNERS.md:23`). **Date:** 2026-08-03.

## The ruling

The team lead: *"we need to start developing framework for telling people how to play the game;
like the tool-tips that show at the start of the game are super dull and dont give much
information. start wiring up the stuff that would make the advisor display on screen like he does
for the crisis."*

He has been explicit before about why that presentation is the one to reuse. During the winter the
advisor takes up a large portion of the screen and *"it actually looks interactive"*, as against an
in-text display; and on 2026-07-31, of the crisis card: *"i just want it to be like its literally
just the advisor and a giant chat bubble that basically shouts, 'Sire! ....' it shouldn't be
contained within a box; it should appear over the actual island screen."*

Two words in the ask decide the shape of the work. **Framework**, so what lands is a sequence that
can be added to rather than a finished tutorial. And **wiring**, so nothing new is drawn: the
presentation, the character, the ten costumes and the copy register all already exist.

## What was there, verbatim

Worth recording, because the replacement has to be judged against it and because two of the four
reel captions had already been duplicated by two of the coach-marks.

`onboarding/useDemoScript.ts`, the reel's four beats:

- *"Drop a building on an open plot."*
- *"Click it to open the lesson and learn the skill."*
- *"Finish the lesson, then practice to build it up."*
- *"Complete it to unlock new buildings!"*

`coachmarks/coachMarksCore.ts`, in the order a new learner meets them (the other seven fire later):

- `place` — *"Drag a building onto an open plot."*
- `sound` — *"Music is playing. Mute it or change the volume under Sound."*
- `learn` — *"Click your building to start its lesson."*
- `build` — *"Finish the lesson + check, then practice to build it."*

Every one of those is a mouse gesture. Between them they never say what the city is, what a
building means, why anybody would want one, or where anything comes from, which is the *"dont give
much information"* half of the complaint. The gestures themselves are the part worth keeping and
they are all still shipped, folded into the moment they belong to.

## The framework

Five files, and the split is deliberate.

| File | What it owns |
| --- | --- |
| `city/AdvisorStage.tsx` | **The presentation**, extracted from `CrisisCallAdvisor.tsx` unchanged: the transparent full-screen stage, the figure, the bubble, the byline, the shout, the dialog semantics, the focus trap and `Escape`. Two callers. |
| `city/onboarding/onboardingScript.ts` | **The content and the three stored facts**: the moment record, the era's advisor, the copy, the done flag, the resumable step, and the list of coach-marks the advisor has taken over. |
| `city/onboarding/OnboardingAdvisor.tsx` | **The surface**: which moment is on screen, the step control, the ways out. Draws no presentation of its own. |
| `city/onboarding/OnboardingDevReplay.tsx` | **The dev hatch**, in `WinterDevSkip.tsx`'s shape and behind the same gate. |
| `city/onboarding/onboardingDevReplay.css` | That control's own stylesheet, `winterDevSkip.css`'s sibling. |

### Adding a moment

Add its id to `OnboardingMomentId` and its row to `MOMENT_BODIES`. That is the whole of it.

The record is keyed by the union, so the compiler refuses a union member with no row and a row with
no union member. `ONBOARDING_MOMENT_ORDER` is the record's own key order, so the sequence, the
"Step 2 of 3" line, the dots, the dev control's per-moment buttons, How to play's loop section, the
copy sweeps and the shot list all pick it up with no further edit. There is deliberately no second
written-down list of moments anywhere.

Two rules for the row itself, both learned from the crisis briefing:

1. **The shout carries no rule.** It is the hook, in character, and a learner who reads nothing
   else must lose no mechanic by it. Everything load-bearing goes in the points.
2. **Name the era's material through `materialWord`, never as a word.** "Stone" is era one's answer
   and era two builds with grain.

At most three points per moment, which is `onboardingScript.test.ts`'s assertion and the crisis
walkthrough's own ruling: *"those sub-slides should be small and isolated to one section, to
prevent users from being overloaded with information."*

## What is populated, and what is deliberately left

Populated: `island` (what the city is and whose), `buildings` (a building is a skill, and the loop
that raises one), `stockpile` (where the era's material comes from and what it pays for).

Left, with reasons, because a wall of advisor dialogue would be a worse tooltip than the tooltips:

- **Population, livability and happiness as consequences rather than currencies.** True, and
  unteachable on minute one: the island has no citizens until something is built, so the panel the
  sentence is about would be describing zeroes.
- **The four-beat era ceremony.** An advance is gated on the era's own mastery, so a learner who
  has not finished a lesson is being told about a door they cannot see. It narrates itself as it
  runs.
- **Crises interrupt and are answered with the same maths.** Left out on purpose rather than for
  want of room: the crisis has its own advisor moment, in this exact register, which fires when it
  matters and gates on being read. Pre-teaching it would be the only fact in the tutorial that
  duplicates a live surface.

## The four properties, and where each lives

- **Sequenced** by `ONBOARDING_MOMENT_ORDER`. One moment is mounted and the others are not in the
  DOM in any form, which is the distinction the ask turns on: a collapsed accordion would satisfy
  the layout and miss it.
- **Resumable.** The step is written to `cr.onboarding.advisorStep` on every advance, and seeded as
  lazy initial state so a resumed sequence paints the right moment on its first frame.
  `resumeOnboardingAt` clamps a stored index that has stopped meaning anything, because a dialogue
  that opens on nothing cannot be got out of.
- **Skippable instantly.** One press from the first frame, `Escape` to the same handler, nothing
  gated. Somebody demoing presses it once.
- **Never repeated.** `cr.onboarding.advisorDone` is set by Skip and by the last moment.
  `cr.onboarding.demoSeen` is read beside it at the mount, so a learner who saw the old reel is not
  re-taught either.

Storage rather than `devSessionStore`, on purpose: that store is the learner's CITY, gated on the
app not being server-backed, and a note about which tutorial line somebody has read is neither part
of their progress nor something a deployed build should stop remembering. The two keys follow
`coachMarksCore.ts`'s shape exactly, `cr.`-prefixed with a try/catch on both sides.

## What happened to the reel and the tooltips

**The reel is not deleted.** Its montage of a real building going up is the one thing a standing
advisor cannot show, so it moved from being the first thing a learner is given to being opt-in
behind `☰ Menu → How to play → Watch the intro again`, where it was already reachable.

**Three coach-marks are retired, and only when the sequence is WALKED.** `place`, `learn` and
`build` are the ones whose whole sentence is now in a moment. A learner who walked the moments has
been told those things, so hearing them again from a tooltip is the complaint itself; a learner who
skipped has been told nothing, so those three still fire and the old behaviour is what they get.
The other eight are untouched, because a hint that fires at the moment it becomes true is the good
half of the contextual layer: *"Music is playing"* cannot be pre-taught, `roadRemove` means nothing
until a tile is paved, and `interleaved` waits on two finished practice sets.

**How to play gained a third route back**, `Talk to Oru again`, because the advisor's own closing
line promises one: *"Ask me again from the menu whenever you like."* Its loop section is now
generated from the moments rather than from the reel's captions, so the card quotes what a learner
is actually taught by.

## The dev hatch

`OnboardingDevReplay`, top-right, one HUD row below the ☰ Menu so it clears it. Two rows, because
they answer two questions: **From the beginning** forgets both keys and runs the sequence as a new
learner gets it, and **Open at** jumps to one moment, because the interesting states of a sequence
are not later, they are different. Behind `isDevPersistenceEnabled()`, which is the gate
`WinterDevSkip` uses; `onboardingDevReplayIsGated.test.tsx` drives the real environment rather than
the prop.

## Evidence

- `docs/design-refs/onboarding-advisor/` — the before state and every moment at 1024x580 under
  reduced motion, with the boxes measured in the same run. Read its README for the honest read,
  including the dock overlap inherited from the crisis geometry.
- `onboardingScript.test.ts` — the moment table, the era-aware copy in all ten eras, the resume, the
  retirement list in both directions.
- `OnboardingAdvisor.test.tsx` — the four properties and the accessibility.
- `advisorIsTheCrisisRegister.test.tsx` — the population of surfaces in this presentation, derived
  from the sources both ways round, and their rendered skeletons compared element for element.
- `CitySurface.onboarding.test.tsx` — the first-run contract, the hand-off, the three replay routes.
- `onboardingDevReplayIsGated.test.tsx` — the gate, in both directions.

## Two defects found on the way, and one guard widened

- **The shared focus trap took a disabled control for its boundary.** Both advisor surfaces hold
  "Back" back at the first step, so on the step everybody opens on, the first match of the
  focusable selector refuses `.focus()` and Tab off the last control left focus where it was. The
  dialogue never leaked; it stopped cycling. Fixed in `AdvisorStage`, so the crisis gets it too.
- **A numeric zero `key` mounted the advisor twice.** `CitySurface` remounts it by key so the dev
  control can open it at a chosen moment, and the first-run token is 0. Two live instances in one
  parent, the first frozen on moment one. A string key behaves correctly; the measurement is in the
  key's own comment.
- **`crisisDressIsTheLiveEras.test.ts` was widened for the extraction.** The crisis card stopped
  drawing the figure, so it matched none of that guard's three costume patterns and would have
  dropped out of the sweep entirely: the one file whose costume depends on two eras at once, back
  to being covered by nobody. A fourth pattern for *forwarding* a costume brings it back, and the
  one assertion over it is now two, one per half of the split.
- **`winterDevSkipStaysDev.test.ts` was narrowed and paid for.** Its offender rule flagged any file
  that named `WinterDevSkip` anywhere and the word `enabled` anywhere, which produced two false
  positives the first time another dev control cited it as a precedent. Scoped to real call sites,
  and paid for with a set equality over the mounts that pins the tree to one.
