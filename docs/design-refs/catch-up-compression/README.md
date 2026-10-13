# The catch-up, compressed: the first founding is the ceremony and the rest are recaps

**Frames at 1024x580 on a real `npm run dev`, taken twice — once under
`prefers-reduced-motion: reduce` and once with motion enabled, because half the point of the
change to beats three and four is what moves.** Regenerate with

```
npm run dev -w @cr/web
node scripts/qa/catchup-frames.mjs --motion reduce
node scripts/qa/catchup-frames.mjs --motion no-preference
```

The same frames are copied to `output/catch-up-compression-*.png`. Every one is the **whole
window** rather than a crop of the surface that changed, for the reason
`.cursor/rules/qa-verification.mdc` gives: cropped to the element that changed a screenshot
proves nothing about what is visible around it, and *"does the shortened version still read as a
ceremony"* is a question about the whole picture.

The timings below come from `output/catchup-beat-timing.mjs`, which drives the same route and
reads the beat boundaries off the DOM rather than off `foundingClock.ts`.

---

## The rulings this answers

> *"the beats are a little too long for the diagnostic seeding, especially since theyll be
> seeing this age repeated"*

> *"this UI looks terrible; clean it up. it makes no sense to the user"*

> *"nothing really happens in beat 3 until the town hall actually upgrades so the users just sit
> there; maybe make it shake or something to fill the time in between the actual transition. same
> for beat 4"*

## ⚑ The number in the brief was measured on a different surface, and the real one is worse

The brief records **27 seconds a ceremony, so five is about two and a quarter minutes**. That
figure is real and it is #511's, and
it is the **shipped in-city era advance** driven through its dev hatch: four beats pressed
straight through in 0.3s, each waited out to rest in under 3.5s. **The catch-up is not that
surface.** Its foundings are clock-paced at `min(60, max(45, walk × 4))` seconds, so nothing in
them can be pressed through and the length is not a settle time.

**Both halves of the pair below were measured on the SAME tree**, which took a second dev server:
`integration` at `6620e5f7` in a git worktree on port 5180 for the before, this branch on 5173 for
the after. That matters because #511, #516, #518, #521, #525 and #530 all merged between the first
measurement and this one, and a before taken at the old tip against an after taken at the new one
is two trees rather than one change. Placed in the sixth era, so five ages are handed over, at
1024x580 under reduced motion:

| | before (`integration` @ `6620e5f7`) | after |
| --- | ---: | ---: |
| **Five-age catch-up, beats only** | **262.2s** | **101.6s** |
| Press to landing, whole walk | 274.1s | 114.6s |
| Age 1 (prehistoric) | 45.1s | 45.9s |
| Age 2 (neolithic) | 47.3s | 14.0s |
| Age 3 (bronze age) | 54.0s | 14.1s |
| Age 4 (classical) | 57.6s | 13.7s |
| Age 5 (medieval) | 58.2s | 13.8s |

**Per beat**, before: 10.8 to 15.1 seconds each, rising with the age. After: **11.1 to 11.6
seconds in the first founding, and 3.0 to 4.1 seconds in every recap.**

The first measurement of the before, taken at `9aecd3bf`, was 271.1s. The 9-second difference
between the two is run-to-run noise on a scene that loads GLBs, and both figures round to the same
statement: **four and a half minutes.**

So the problem was **four and a half minutes rather than two and a quarter**, and it got worse as
the walk went on, because the full budget rises with the island — beat one is citizens walking
across it. The recap has no rim-to-centre walk to pay for, so it is 14 seconds at every era and
the ramp is gone.

## What the recap gives up, and what it does not

The design constraint is the lead's own description of what the catch-up is for: *"they still get
to see the era progress and all the citizens gather and the retheming happens, so they still get
the progression feel."* So the question is not how to make a founding faster. It is **what the
fifth one owes that the first one already paid for**, and the answer is the establishing walk.

- **All four beats play in a recap**, at every era, asserted rather than photographed
  (`foundingClock.test.ts`).
- **The crowd still walks in.** What changes is the distance: they open at the point
  `CATCH_UP_WALK_SPEED` can carry them home from inside one recap beat, and they move at that
  same ruled speed in both shapes at all ten eras. That is what keeps §4.6's *"calm,
  low-amplitude"* satisfied **by construction** rather than by argument — a recap that simply
  shortened beat one over the same 46-unit medieval walk would be citizens moving at four times
  the ruled speed, which is a different tone rather than a faster one.
- **The first founding is byte-identical to what shipped.** `fullFoundingSeconds` is the
  expression it always was, and a test restates that expression rather than importing it, so a
  later edit that shortened the ceremony to buy the repeats some time fails there.

---

## The frames, and an honest read of each

### `01-prompt-age-one` — the card the lead called confusing

`AGE 1 OF THE 5 YOU TESTED OUT OF` · **Prehistoric Era** · *This age is about counting, sharing,
and doing it in the right order.* · *The city is walking forward through the five ages you tested
out of, one at a time.* · the closed disclosure · **two roads, stacked, each with its trade under
it** · *The lessons stay open whichever you pick.*

**Read: this is a considerable improvement and it is mostly the spec restored rather than a new
design.** The three roads were `§10.7`'s, and `§10.7` is stamped *"SUPERSEDED … what goes is the
three-option list"* in its own document; `§10.19` and `§10.25`'s ruled prompt is two buttons at
every one of their four worked examples, and `§10.10` rules the build mode out of the per-age
question entirely. So the fix for *"the three roads are not three"* was to stop having three.

The consequence lines are the single biggest change to how it reads. The forfeit used to be a grey
footnote under both buttons — *"the actual trade being offered"*, in the lead's words, set smaller
and greyer than everything above it — and it is now the sentence attached to the button that
causes it.

**Measured, closed: about 305px of a 580px window, leaving about 258px of island with the Town
Hall in frame.** That is better than the 350px the three-road shape managed, despite two more
lines of copy, and the reason is a defect the first frame of this branch caught: every paragraph
in the well was carrying the user agent's own 1em block margin, so the card stood at its 420px
ceiling with the footer clipped at the window's edge.

**What I would still change.** The two roads are the same weight, which is right, and it does mean
neither has any pull. §10.5 rules that deliberately — *"there is nothing behind it to dismiss to,
so there is no doing nothing"* — so this is the ruling working rather than a defect, but a
reviewer looking for a default will not find one and should know that is on purpose.

### `02-prompt-disclosure-open` — the collapsed content, opened

The summary in full, `THE SIX SKILLS`, and all six titles, with the roads still below the fold's
edge.

**Read: the collapse is the lead's own ruling and I have not overruled it.** §10.20 is verbatim:
*"it doesn't have to show in the main screen, but it should still be viewable."* §10.23 also
forbids a count badge on the closed control, so *"What this age covers · 6 skills"* — the obvious
way to make it read as a container — is ruled out too, and the affordance is improved in weight
rather than in warning.

**It did get better in one way that is worth recording**: with the paragraph margins gone, era
one's whole list now fits without scrolling, where the committed frame from #490 showed it clipped
mid-glyph under a hairline. The panel is about 508px open, which leaves about 57px of island. That
is a real trade and it is taken deliberately: tier two is opt-in and momentary.

**If the lead still thinks the useful content is buried, this is where to argue with him**, and
the argument is his own §10.20 rather than mine.

### `03-first-age-placed-by-hand` — where the agency went

`0 of 6 standing. Open the build menu to place the rest.`

**Read:** the hand-placing did not go away, it went where D-ERA18 puts it. *"Every student places
era one by hand; later eras auto-fill during the montage … the agency and the teaching both land
the first time; repeating them is repetition rather than learning."* That is the same sentence the
compression is argued from, arriving from the other direction, which is the strongest thing I can
say for either.

### `04-full-beat1-gathering`, `05-full-beat2-expansion` — the two beats that were always alive

**Read:** unchanged and untouched. Measured before the change, these two moved the picture in
**every** sample of every founding. They are the reason the ceremony works at all, and nothing
here shortens or fills them.

### `06-full-beat3-rebuild-early` vs `07-full-beat3-rebuild-late` — the beat that was empty

The scaffold ring around the hall, at three rungs and then four.

**Read: this is the pair to look at, and it is a real change.** On `integration` at `6620e5f7`,
beat three changed the picture in **1 of 12, 2 of 10, 1 of 17, 1 of 18 and 0 of 17** sampled frames
across five foundings, and the one sample that moved was the boundary where the hall pops to the
new age. At medieval, **zero of seventeen samples moved at all**, peak 0.03% of frame. A learner
watched an eleven-second still frame with a caption on it.

Now the ring's lashed rails fill in from the ground up as the hall rebuilds, and the same
measurement on the same tree gives **3 of 13, 3 of 3, 4 of 5, 3 of 4 and 3 of 4**.

**And the first thing I built for this beat did not work, which is worth recording because it
would have passed every test I wrote for it.** It was a stack of the era's own material arriving
beside the ring, course by course — position-carried, monotonic, correct, and about **30 pixels
across** at the ceremony's own lens. Comparing the frame at `rebuild` 0.55 against the one at 0.72,
the difference was a few pixels near the top of the ring. The count moved and the frame said
nothing, which is the substitution the QA rule is about, arrived at from the other side. The rungs
are the repair, and what makes them different is not the arithmetic but that they are as wide as
the hall.

**What I chose and why.** The lead suggested a shake. The instinct is right and a shake of the
hall is the wrong object: the visual brief rules MODERATE juice and *"celebration amplitude stays
low and earned"*, and a building that shudders while it is being rebuilt reads as an earthquake
rather than as work. What the era's own language has for *"a hall is being rebuilt"* is
scaffolding, and `constructionStages.ts` already owns the timber tone that beat two's survey
stakes are drawn in. So beat one raises the ring, beat three climbs it, and beat four strikes it.

### `08-full-beat4-retheme-early` vs `09-full-beat4-retheme-late` — the works coming off

**Read:** the ring is half struck in the first and all but gone in the second, with the hall
standing finished and — since #521 — era two's standing crop across the island behind it. Beat
four went from **3 of 8, 2 of 10, 4 of 13, 1 of 17 and 2 of 17** to **7 of 10, 3 of 3, 3 of 3, 4 of
4 and 4 of 4**.

I did not touch the palette swap at the halfway mark, and that is deliberate: `eraCeremonyStage.ts`
rules that ground 40% of the way between two palettes *"is not a state anybody can read"*, and a
cross-fade there would be filling dead time by making the payoff worse.

**⚑ #521 LANDED HALFWAY THROUGH THIS WORK, AND THE FRAMES ARE RE-TAKEN ON TOP OF IT.** When the
first pass of this branch was measured, #521
was open with `mergedAt` null, so era two's fields were not on the tree and the prehistoric retheme
measured **0.62% of frame**. It merged at `2026-08-04T01:32:52Z`; on the merged tree the same beat
measures **2.73%** before this branch and **26.06%** with the works on it, and frame `09` shows why
— the island fills with standing crop and ploughed ground. So beat four at era one is no longer
dead time, and most of that is #521's rather than this branch's.

**The gap that remains shows in `14` and `16`:** era three's ground is unauthored, so every retheme
after the first turns the island placeholder grey. Not this branch's to fix, and worth knowing
before the demo.

### `11-recap-beat1-gathering`, `15-recap-age-four-gathering` — the crowd, on a repeat

**Read: the citizens are there and they are walking.** In `15` the eight figures are visible above
the ring, part-way in, with the works around the hall below them. This is the frame that answers
*"does it still read as a ceremony"* for beat one, and my honest answer is **yes, and it is
thinner than the full one**. What you lose is the sense of people converging from all over the
island, which is the thing the full walk buys and the thing the fifth play of it does not need.

**One thing that is not the compression's doing and reads badly anyway:** the ceremony's lens
closes hard on the gathering ground, and at 1024x580 there is very little island left in frame
during beat one. #511 found the same thing on the in-city advance. It makes the recap's beat one
look tighter than it is.

### `13-recap-beat3-rebuild`, `16-recap-age-four-rebuild` — the whole question

**Read: it reads as a ceremony, not as a transition somebody forgot to finish, and here is what
that judgement rests on.**

Three and a half seconds is short. What stops it reading as cheap is that **nothing was removed**:
the caption names the beat, the four-track rail is under it at the same size, the works are around
the hall, the crowd is standing there and the island is doing the thing the beat is named for.
Frame `13` and frame `07` are the same picture at different points in the same choreography.

What is honestly weaker is the *dwell*. In the full founding you get a couple of seconds to look at
the finished hall before the age turns; in a recap the next beat is already starting. That is the
trade, and it is the right one at the fifth play, because the thing a learner has stopped needing
is the time to work out what they are looking at.

**Where I would draw the line.** If `RECAP_BEAT_SECONDS` went below about 2.5 I think it would
start reading as a cut rather than a beat, and at that point the honest move would be to drop a
beat rather than to flicker four.

### The motion-enabled set

**Read, and it is a limit on the evidence rather than a finding.** Under motion the scene is never
still: gulls cross the frame, clouds drift, and the sampler's *"moving"* count saturates at every
beat of every age. So the motion-on run cannot distinguish the scaffold's settle from a seagull,
and it is **not** the evidence that the settle works.

What the settle is, is 0.04 world units at 0.9 Hz, per-pole and out of phase — well inside §4.6's
calm register and deliberately too small for a still frame to show. **Under reduced motion it is
removed entirely rather than damped**, which is the brief's own instruction, and it is safe to
remove precisely because it carries nothing: the rungs and the poles are counts, so every
reduced-motion frame in this folder shows the beat's progress without it.

---

## What is not fixed

1. **The lens during beat one**, above. Pre-existing, and it makes the recap look tighter than it
   is.
2. **Era three and later have no authored island ground**, so the retheme at those ages turns the
   island placeholder grey. `13`, `14` and `16` show it. Not this branch's.
3. **The first-run onboarding reel opens over the catch-up** on a fresh session, which the frame
   probe has to dismiss before it can photograph anything. On a real route the reel comes first,
   so this is an ordering question for whoever owns the demo path rather than a defect here, but
   it will be on screen on Friday if nobody looks at it.
4. **The concept line is still a description of mathematics.** *"This age is about …"* fixes the
   reading and not the content; the fuller fix is a per-era line naming the world rather than the
   mathematics, and every one of the ten summaries already ends in one. That is authoring in the
   era registry, and this pass did not do it.
