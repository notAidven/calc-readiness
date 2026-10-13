# What testing out FEELS like: a learner-first review of the five placement options (DESIGN RECORD, nothing built)

> ## 2026-08-09 IMPLEMENTED AMENDMENT
>
> Diagnostic placement auto-founds its derived skipped island prefix and asks no unlock exams
> for it. The learner sees one concise Town Hall founding representation per skipped island.
> Older multi-stage catch-up ceremony analysis below is historical and no longer product copy.
>

**Recorded 2026-08-01. First written at `integration` @ `56497b6b`, RE-GROUNDED at `3b655728`
after #389, and RE-GROUNDED AGAIN at
`061b406d` after #387,
#395 and
#396 landed underneath it. **Every
file:line citation was re-checked mechanically against an expected token at each tip and all of
them held**, which is what the re-check establishes rather than assumes: both merges are in the
crisis-art, vehicles and music lanes and touch no file this record cites, and the second added 4,618
lines of documentation and no code. Four of my own citations came back off by a line on the first pass and are recorded
here as the ranges they actually are: the diagnostic's lede is `DiagnosticRunner.tsx:506-508`, the
witnessed-crowd argument is `2026-07-29-era-trial-contract.md:1348-1349`, D-END5's
cold-confirmation line is `2026-07-31-game-completion-ceremony-design.md:323-324`, and D-ERA5 is
`2026-07-27-era-progression-design.md:351-353`.**

**AMENDED THREE TIMES 2026-08-01 AFTER MERGE.** The third amendment is §10.20 to §10.25, recorded at
`integration` @ `7313b7ac`, which is also the merge commit of
#398 (`mergedAt` `2026-08-01T21:59:08Z`, read
from the API), **so nothing landed between §10.19 becoming trunk content and this amendment being
written**, and the four facts it rests on were re-checked at that tip regardless.

**AMENDED TWICE 2026-08-01 AFTER MERGE.** The second amendment is §10.14 to §10.19 and it re-grounds
the record at `integration` @ `d829eb85`, where **two things happened that the QA rule exists to
catch.** #386 **MERGED** at
`2026-08-01T21:32:36Z`, so sixteen citations that said its figures were not on `integration` are
corrected in place. And #384 authored
**all ten land budgets** and moved `packages/skill-graph/src/eras.ts` by 405 lines, which **moved five
file:line citations, two of them load-bearing**: D-ERA18 is now at
`2026-07-27-era-progression-design.md:1994` with its ruling row at `:2644`, and D-ERA17's rule is at
`:2039-2041`. **All five are re-pointed and every re-pointed line was verified by reading it.** §10.18
re-measures the one figure that expired.

**AMENDED 2026-08-01 AFTER MERGE, by a second ruling the same day.** This record merged as
#391 at `2026-08-01T21:26:25Z`, read from
the API, merge commit `92373ea0`. The lead then ruled **O-TX14**: **the choice is a stopping point,
not a per-era toggle**, and stopping at an age forfeits the skip for everything after it. **§10.9 to
§10.13 record it, rewrite the strings, and re-check the numbers.** Three earlier pieces are
superseded and each carries a note where it stands: §10.4's open question, §10.5's build-mode default
and §10.7's option strings. **Nothing is deleted**, following the convention the era documents use.
Re-grounded for the amendment at `integration` @ `1c0a3113`, with every citation re-checked at that
tip.

**THE DECISION IS RULED AND §10 IS THE RULING.** The team lead ruled on 2026-08-01 for **the
per-era choice plus a single founding plus zero confirmation questions**, and for investing the
saved effort in the reject affordance instead: *"zero, but make the reject harder to miss."* **§10
records it, records the residual it accepts, and designs the affordance the whole ruling now depends
on, including the strings.** §9's recommendation is superseded in one term and is kept unedited
below, because the argument it lost is the argument the ruling had to beat.

**This record was revised three times and §8 is where two of the revisions landed.** Its first draft
concluded there was no sixth option. **That conclusion was wrong, and it was wrong in a way worth
recording rather than editing away**: the derivation swept one axis and announced a result about the
space. Two further axes existed, one supplied by a reviewer and one by the team lead. **And §8.5's
finding, that the ruled state already discharges the trial for prologue-placed eras, is what made
the lead's third road visible at all** (§10.1).

**Status: DESIGN RECORD. No production code changed and no ruling made. This is a second
opinion on an option already recommended, and it disagrees with it in one specific place.**

**Quoted copy is reproduced byte for byte, punctuation included.** Four quotations of shipped
strings therefore carry an em-dash that the prose around them does not, because altering a
quotation to satisfy a house style would be the worse fault. **The copy this record PROPOSES, in
§10.7, contains none.**

**The lead's direction, verbatim, and it is the whole brief:**

> *"im very strongly concerned with the user experience associated with this, not just the
> permeability metrics. this needs to be strongly considered"*

## What this record is, and what it deliberately is not

Two records already cost this decision and both are engineering analyses.
`docs/superpowers/specs/2026-08-01-test-out-placement-experience.md` (merged,
#380) offers five options A to E
and recommends **C**. `docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md`
reprices C and adds per-option safety; **it is on
#386, **which MERGED at
`2026-08-01T21:32:36Z` (merge commit `cbaf9271`, read from the API) after this record's third
revision.** Every figure of its is therefore now on `integration`. **The earlier revisions marked
them as not-on-integration and were right at the time**; the marks are corrected in place rather
than deleted, because a reader comparing revisions needs to see that the caveat was live and then
was not. The branch SHA `05e07c11` is kept beside each figure, since that is the tip its harnesses
ran at.**

**I re-derive none of their arithmetic.** §2 is a citation table and everything after it
treats those figures as settled. What is missing from both records is not a number. It is
the clock: they have the tables, and a table cannot show you that a learner has been in the
product for half an hour without being taught anything. §5 is five walkthroughs written to
put that on the page.

**On the two skills the brief pointed at.** `.claude/skills/critique/SKILL.md` and
`.claude/skills/shape/SKILL.md` do not exist in this repository and never have:
`git log --all --diff-filter=A -- '.claude/**'` returns nothing and there is no `.claude`
directory at the tip. The available skills are under `.cursor/skills/`, none of which covers
design critique. So the structure here is mine, and it is not the structure those skills
would have given.

---

## 1. The answer up front

**Sixteen findings, in the order that changes the shape of the problem. The first was found last and it
reshapes the whole comparison; the last seven are the rulings and the design they depend on.**

0. **The thing both records treat as needing a ruling is already ruled, and it is ruled in
   Option B's direction.** **D-ERA18 (DECIDED)** is *"every student places era one by hand; later
   eras auto-fill during the montage"*
   (`2026-07-27-era-progression-design.md:1994`, ruling row at `:2644`), and **D-ERA17's rule
   stated plainly** is *"the diagnostic discharges lessons. It never discharges mastery or a
   trial, **except for the eras the prologue places you past, while its evidence is still
   fresh**"* (`:2039-2041`). **Neither existing record cites either ruling**, verified by
   `rg -c "D-ERA18"` over both. Read at the tip and unsuperseded, this means: the montage the
   lead's original brief described **is the ratified model**; a tested-out era needs no trial
   **today, by ruling**; and therefore **Options C and D are not the middle ground, they are
   departures from the ruled state, and the merged record's ruling-cost column is inverted.**
   What C and D need is not an amendment to D-ERA16 but a reversal of D-ERA17's prologue
   exception. §8.5.

1. **The engineering axis cannot separate Option A from Option C, and that is why the
   experience question was left open.** The merged record's §5.1 says A *"collides with SPOV
   3 by name"*. Read at the tip, it does not. SPOV 3's operative clause is *"every action in
   our core loop must be a genuine retrieval rep and any click that is not learning gets
   cut"* (`docs/BrainLift_Game_Design.md:50`), and a practice item on a node a learner
   already knows **is** a genuine retrieval rep. The only thing on this table SPOV 3
   straightforwardly condemns is B's time-lapse, which is a watch. What actually condemns A
   is not in the BrainLift at all: it is one sentence in the test-out amendment about
   friction a readiness product should avoid, and that is an argument about respect rather
   than about learning. **So the whole comparison has been running on an axis that cannot
   see the thing the lead is asking about.** §4.1.

2. **The era model FORCES the compression, so SPOV 4's own evidence base indicts the
   massing rather than the count.** SPOV 4 asks for an already-built skill to resurface
   *"for a light recall check at expanding intervals"* (`:52`), and its primaries are the
   spacing literature. Option C's 42 questions arrive inside one sitting, minutes after the
   diagnostic. That is the massed version of the thing SPOV 4 asks for spaced. **And it
   cannot be fixed**, because three ruled properties make a tested-out run contiguous: eras
   are strictly ordered by array position (`packages/skill-graph/src/eras.ts:16`), exactly
   one building tracks the present and it is the chapter marker
   (`2026-07-27-era-progression-design.md:1655`), and the buildable radius is per era and
   fail-loud (`eras.ts:331-339`). **So no option can space this run. The only free variable
   is how many rituals the massed run is cut into**, and that is the variable D moves and C
   does not. §4.2, §8.

3. **Beat one, measured: eight people.** The ceremony opens on *"the citizens gather"*, and
   for a tested-out learner at mastery 0 the island holds `FOUNDING_POPULATION` and nothing
   else, against **44** for a cold learner at era one's ceremony and **134** at era four's.
   Eight, for every era count from one to nine. This **corrects the merged record's §3**,
   which says a tested-out node *"scores the first term and not the second"*; at the tip it
   scores **neither**, because `complete` gained a mastery floor on 2026-07-30. Driven
   through the real function in §7.1.

4. **The tested-out learner arrives broke, by ruled design, and no option costed it.** Row 1
   of the earn table pays only a node that has cleared the mastery bar **and** carries
   practice evidence, and the second conjunct exists specifically to close the test-out seam
   (`apps/web/src/economy/useEconomy.ts:75-107`). So a learner who tests out of era one
   forgoes all 600 stone of era one's lesson channel against a catalogue whose
   livability-and-happiness target is 540. They are handed a city and cannot lay a road tile
   in it. Their only remaining faucet is interleaved practice **on the skills they tested out
   of**, which is either exactly SPOV 4 or exactly SPOV 3 depending on how it is framed, and
   nobody has framed it. §7.2.

5. **The sentence a test-out message needs is already written, in the wrong document.**
   D-END5's cold-confirmation line, *"you sat down today with no lessons, no hints and no
   retries, and these held"*
   (`2026-07-31-game-completion-ceremony-design.md:323-324`), is neither a consolation prize
   nor a boast: it states the conditions and lets the fact stand. The shipped test-out
   copy says *"You tested out of 21 of 62 skills!"* and *"21 buildings free"*
   (`apps/web/src/city/UnlockCelebration.tsx:288,291`), which is the celebratory register and
   reads like a coupon. §6.3.

6. **Agency over how the city is structured does not vary across the five options, so the
   trade-off the lead cannot see how to make is not on this axis.** Placement is 21 in every
   option except B, it is **free** (`placeSkill` is *"in-app layout write only (never a game
   write)"*, `apps/web/src/city/citySession.ts:682-686`), and **D-TH9 makes every placed
   building movable forever**, so even B's auto-layout defers the choice rather than spending
   it. What genuinely varies is confirmation volume and ritual packaging, and neither is
   agency. **The agency he is worried about losing is real and it is elsewhere**: roads, civic
   purchases and decorations are all material-gated and this learner has none (§7.2), and the
   crisis pool is empty at mastery 0. §8.6.

7. **Halving the trial to one item per node is a real option, it costs a measured 20x in
   permeability, and it only works at run granularity.** Re-derived rather than assumed:
   detection falls from **99.75% to 95.00%** and the residual silent advance in era one from
   **1 in 20,000 to 1 in 1,000**, against Option B's 1 in 50. **The re-queue does not recover
   it**, because D-ET13 fires on a miss and the never-missed case is exactly what slips.
   **OT-14 is unaffected** and is far more live than "a determined miss streak" suggests, at a
   16.6% exhaustion probability on a 35-item pool. **OT-2 breaks at era granularity and is
   fixed at run granularity**: one item per node is 1.25 to 2.25 answers a beat per era, which
   is OT-12's territory, and 5.25 over a four-era run, which is inside the band D-ET8's own
   rejection implies. §8.3.

8. **Option F, the lead's own design, is measurably the worst option on repetition and it
   cannot pace its own beats.** Measured: F is **0.73 advisor lines a minute against C's
   0.57**, with **5.5 minutes between ceremonies against C's 7.0**, so it makes the repetition
   sharper rather than softer, exactly as he suspected. And placement cannot substitute for
   answers as the pacing currency: F offers **1.31 placements a beat** where D-ET8 rejected
   6.00 *answers* a beat as too slow, so F's beats must be clock-driven, which is B's montage
   with a stop button. **F also saves only 6 minutes of 28**, because the placements dominate
   and the questions never did. §8.4.

9. **RULED: the per-era choice, one founding, and ZERO confirmation questions.** §9 recommended
   one item per node and the lead declined it: *"zero, but make the reject harder to miss."*
   **Finding 0 is why that is cheap rather than reckless**, since zero is the ruled state, and
   **§10.2 records the residual it accepts as accepted rather than solved**: the risk is
   `2.0% × P(accept | over-placed)`, bounded at 1 in 50, and **that conditional is now the only
   thing the design is aimed at.** §10.

10. **The affordance needs a problem on screen, not a worked example, and the difference is in
    this repository's own evidence.** Replacing *"do you know this?"* with a recognition
    judgement is right. But the BrainLift's Category 4 documents that exposure inflates
    confidence (`docs/BrainLift_Game_Design.md:273,281,283`), so **a worked solution presses the
    scale in the fail-open direction and hardest for the learner who cannot do it.** Show the
    problem, never the solution. **And every element the screen needs already exists**, including
    ten authored learner-facing era lines whose no-node-ids discipline is enforced by a sweep
    over 62 node ids rather than by review. §10.3.

12. **RULED, second ruling of the day: the choice is a STOPPING POINT and it is a third answer,
    better than both offered.** One integer rather than n booleans, because **the skipped set is now
    necessarily a prefix**. Measured: at nine ages a per-era reject toggle offers **512 states of
    which 10 are buildable**, so 502 were traps, which is *"otherwise it gets messy"* with a number
    on it. Two properties nobody asked for fall out: **the dial cannot fail open**, since it is
    bounded above by the diagnostic's own answer, and **one correct instinct now protects the whole
    tail** rather than one age, which matters because the persona's instinct is a direction rather
    than a location. And with D-ERA18's default restored the four-age block is **6.3 minutes**
    against 28 for C. §10.9 to §10.13.

13. **REVISED: the walk is per age, the beats play at each one, and the surface loses its probe.**
    The lead cut the sample problem and asked for the beats at every age. **That reopened the
    repetition tension and the resolution is to cut the WORDS rather than the ceremonies**: the
    re-theming is per-era authored art and the four advisor lines are module constants, so **silence
    through the catch-up takes the beat-line repeat count to 0** against 4 narrating and 1 for the
    single founding. It also discharges §8.2's debt for free, because those four lines are **false**
    for this learner over an eight-person crowd. **"Faster" cannot be a comparison**, since an
    ordinary advance is answer-paced and has no duration, so it is an absolute budget with a floor
    that is not this design's to pick: beat one is citizens walking, and at 2x the shipped walk speed
    it is 6.9s at age one and 21.6s at the widest radius. **Four ages: 8.0 minutes.** §10.14 to
    §10.19.

15. **RULED: the skills go behind a disclosure, in two tiers, and tier two leads with the summary
    rather than the titles.** One concept line in the well, the skills on demand. **That dissolves the
    fit problem**: 192px against the 289px well with **97px spare**, against 312px for the one-tier
    list. **Tier two leads with `summary` on three reasons and the third is the deciding one**: the
    summary is compile-enforced total where the titles are absent for two whole eras, its own docblock
    names this reader, and **the titles are lesson headings rather than learner descriptions**, so era
    one's list contains *"Field properties / distributive"* where its summary is a sentence a learner
    can read. **And tier two fits today only because the two nine-node eras have no titles yet**: once
    D6 and D9 land it overflows by 47 to 95px, so it needs a scroll from the day it ships. **The walk
    does not move**, because tier two is opt-in. §10.20 to §10.25.

14. **The skills list informs the decision and does not move the residual, and the record says both in
    the same breath.** A name answers what is in here; a problem answers can I do it. **It is safe**,
    because a list cannot manufacture competence, so the finding that killed the worked example does
    not reach it. **And it does not fit**: measured, a six-skill age needs 312px against the 289px well
    at 1024x580 and a nine-skill age needs 384px, before any of the 67-character titles wraps. **The
    residual stays at its bound of 1 in 50 and is now unaddressed by design rather than targeted by
    it**, recorded as the ruling it is. §10.15, §10.16.

11. **The single founding collapses the reject from n toggles into one boundary, and the
    affordance needs no checker.** Once the beats play once, an accepted set has to be a
    contiguous prefix, so *"where do I take over"* is one dial rather than four buttons, which
    removes the repetition that was F's worst measured number and is the only shape that works at
    nine eras. **And because the learner only looks at the sample problem, nothing is graded**,
    so this is the one piece of the design that is not blocked on the v1 checker and can be
    usability-tested at era one today. That test is the only evidence
    `P(accept | over-placed)` can ever have. §10.4, §10.3.

---

## 2. The figures this record cites rather than re-derives

Read the middle column as **claimed at the stated SHA by the stated record**, not as
re-measured here. The right column says which are on `integration` and which are not.

| Figure | Source | On `integration` @ `56497b6b`? |
| --- | --- | --- |
| **57-item** entry diagnostic over 34 probed nodes, for a learner who answers everything correctly at the full 62-node scope | `2026-07-31-game-completion-ceremony-design.md:528`, measured at `2a484b1b` | **Yes** |
| A learner who answers everything **incorrectly** serves **17** items | same, `:530` | **Yes** |
| **105** practice items to master 21 nodes (5-item set, `Mastery_Scoring_Spec.md:51`, mastery at 4 of 5, `:11`) | `2026-08-01-test-out-placement-experience.md:333` | **Yes** |
| **42** trial questions across eras one to four (`CEREMONY_ITEMS_PER_NODE = 2`, `eraCeremony.ts:200`) | same, `:334` | **Yes** |
| C removes **90.7%** of the practice baseline for an eligible learner (1.96 nodes, 9.8 items residual) | `2026-08-01-diagnostic-placement-accuracy.md:419`, measured at `c9001a1a` | **YES since `cbaf9271`.** #386 merged 21:32:36Z |
| B silently advances **1 in 50** against C's **1 in 20,000** | same, `:365-368` | **No**, same PR |
| Four-era **precision 100.0%** on 516 students, **sensitivity 38.7%** on 1,334 | same, `:229` | **No**, same PR |
| Era-fire base rates: **73.2%** at k=1, **31.1%** at k=2, **8.6%** at k=4, **0.2%** at k=10 | same, `:226-230` | **No**, same PR |
| The checker blocker: **22 of 66** D1+D2 walk items ungradable, **4 of 5** D2 nodes wedge the walk | same, §9, re-measured at `c9001a1a` | **No**, same PR |

**Two inherited caveats travel with all of the accuracy figures and I do not weaken them.**
Every one is the instrument against a synthetic model rather than against a human
(`2026-08-01-diagnostic-placement-accuracy.md:321-330`), and the base rates are the
generator's ability distribution rather than any cohort's. Where I lean on a base rate in §9
I say what it would take to falsify the conclusion.

**And the binding constraint, which none of this changes: none of it is buildable.** The
diagnostic reaches era one only, at five independent composition points, and eras two
through ten resolve to zero plots and hold no authored land
(`2026-08-01-test-out-placement-experience.md` §2.1, §2.4). The widening is blocked on the
checker. **This is a decision to settle, not a defect to fix.**

---

## 3. The target feeling, named per learner type, before anything is evaluated

The brief is right that these are four different people and that the options serve them
differently. So each gets three sentences: the one we want them able to say, the one that
means we failed, and what in the repository backs the choice.

**One thing to hold throughout: only the first of the four is the persona this product was
designed for.** `docs/Game_Visual_Design_Brief.md:50-55` names exactly one, *"Maya"*, and she
is *"underprepared, not incapable"* and *"math-anxious"*. There is no second persona
anywhere in the tree. Everything in §6.4 follows from that.

### 3.1 The learner who tests out of nothing

**Wanted:** *"It found the gaps I could not name, and it did not make me feel stupid doing
it."*

**Failure:** *"I just failed a test before I was allowed to start."*

**Backing.** This is the ruled persona and the tone is already built for her: *"Calm and
non-punishing… Failure is never a loss"* (`Game_Visual_Design_Brief.md:59-60`), and the
diagnostic's own lede says *"It's not a test you pass or fail"*
(`apps/web/src/diagnostic/DiagnosticRunner.tsx:506-508`). **Her diagnostic is also the
shortest one**: 17 items if she answers everything incorrectly, against 57 for an ace,
because a confirmed failure prunes its dependent cone
(`2026-07-31-game-completion-ceremony-design.md:530`). **No option in §5 touches her**, which
is worth stating because it means every option's cost falls entirely on the other three.

### 3.2 The learner who tests out of one era

**Wanted:** *"It gave me credit, and the real thing started immediately."*

**Failure:** *"Six buildings appeared and then I was back doing the beginner version."*

**Backing.** This is the modal test-out learner and nearly the only reachable one: the live
diagnostic's scope **is** era one's node set (`2026-08-01-test-out-placement-experience.md`
§2.1), and at the full scope era one fires for 73.2% of generated students against 31.1% for
the first two (`2026-08-01-diagnostic-placement-accuracy.md:226-227`, measured on branch `05e07c11`). **C and
D are identical for this learner**: one era, one trial, one ceremony, then era two's real
content. That fact does most of the work in §9.

### 3.3 The learner who tests out of four eras

**Wanted, and this is the one the brief asks to be named:** *"The city already knows who I
am, and the part I actually came for starts today."*

Two halves, and they pull against each other. **Recognition**: the island reflects what I
brought through the door rather than what I have done since. **Arrival**: I got to the edge
of my own knowledge in one sitting instead of four evenings. The lead's candidate, *"this
respects me, and the city is still mine"*, is the same two halves, and naming them as one
feeling is what hides the trade: *respects me* pushes toward asking less (B, E) and *the city
is still mine* pushes toward building more (A, C). **Every option resolves the tension by
giving up one half, and no option is available that gives up neither.** That is the honest
frame and it is the frame the existing tables do not have.

**Failure:** *"I answered a hundred questions and watched the same cutscene four times."*

**Backing.** 21 nodes, 42 trial questions, 105 practice items, 4 ceremonies under C
(`2026-08-01-test-out-placement-experience.md:332-334`; reproduced in §7.1's run). The
recognition half is what the placement already delivers and INV-ERA-1 protects, since an era
advance may never reshuffle a layout the player arranged
(`2026-07-27-era-progression-design.md:199-201`).

### 3.4 The learner who tests out of nine eras

**Wanted:** *"I was right that I did not need this, and it took me seriously enough to say
so."*

**Failure:** *"I proved I did not need the game, so it gave me nine of it."*

**Backing, and the brief's instinct that this is nearly a different product is correct in
arithmetic.** Measured over `ERA_SEQUENCE` in §7.1: eras one to nine are **53 nodes**, which
is **106 trial questions** and **265 practice items**, and under C it is **nine ceremonies
back to back**. Under D it is one ritual over 106 questions, which is 26.5 answers a beat.
**Neither works, and I do not fix it here.** What I do is name why it is a different product:
this learner is not the persona. *"Underprepared, not incapable"* is false of them in the
first half. A product whose entire tone is calibrated to reassure has nothing calibrated to
say to somebody who needs to be believed rather than soothed, and §6.4 is about that gap
rather than about this learner's option.

**The population is also small and the smallness is load-bearing rather than a dismissal.**
P(all ten eras fire) is 0.2% and the k=10 precision cell rests on 12 students, which that
record says in its own words should not be quoted
(`2026-08-01-diagnostic-placement-accuracy.md:230,588`, measured on branch `05e07c11`). **So the nine-era case
is unpriced for safety and should be routed rather than designed for**, which is what O-TX4
in §11 asks.

---

## 4. The five arguments, tested rather than adopted

Each is labelled **CONFIRMED**, **REFUTED** or **SHARPENED**, and where it is sharpened the
sharpening is the point rather than a hedge.

### 4.1 "C makes them prove it twice": SHARPENED, and it gets worse and better at once

**Worse, because the product promised otherwise in shipped copy.** Two surfaces make the
promise in the learner's own words before they answer anything:

- `apps/web/src/TitleScreen.tsx:111`: *"New here? Take the diagnostic — skills you already
  know are built for you."*
- `apps/web/src/diagnostic/DiagnosticRunner.tsx:506-508`: *"It's not a test you pass or fail
  — it just finds where to begin and seeds your city so you skip what you already know."*

**Read plainly, Option C breaks the second one.** The promise was written about lessons,
which is what test-out ratified, and *"skip what you already know"* does not survive contact
with 42 questions on what you already know. **So the objection is not that C tests twice. It
is that C tests twice after saying it would not, and that is either a copy change or an
option change.** Nobody has picked which, and picking is cheaper than either record makes it
look.

**Better, because "twice" is arithmetically generous to the diagnostic.** The published
accuracy figure is denominated over the whole scope rather than over the probed nodes, and at
a median of 6 probed of 11 *"roughly five of the eleven are graded on inference and pruning
rather than on an answer"*
(`docs/Diagnostic_11_Node_Scope_Decision_Evidence.md:275-291`, quoted at
`2026-08-01-diagnostic-placement-accuracy.md:88-93`). At the full scope the acing walk probes
**34 of 62** nodes (`2026-07-31-game-completion-ceremony-design.md:528`). **So for a
substantial share of the 21 nodes the learner never answered anything at all, and the trial
is not the second proof, it is the first.** That is a real defence of C and the merged record
does not make it.

**Where it lands.** The feeling "being doubted after passing" is real and the copy is what
decides whether it fires. A learner told *"the diagnostic ruled out the lessons; the
inspection is where the city changes hands"* is not being doubted. A learner told nothing is.

### 4.2 "Their first hour is all assessment": CONFIRMED, and the mechanism is worse than stated

**Confirmed on the clock.** §5.3 walks it: under C the first thing the learner **does**, as
opposed to answers, is at about minute 21, and the first thing the product **gives** them
never arrives in the first three quarters of an hour.

**The mechanism is the inversion nobody has named: the strong learner's diagnostic is the
LONG one.** 57 items for an ace against 17 for a learner who answers everything incorrectly
(`2026-07-31-game-completion-ceremony-design.md:528-530`), and that record says in as many
words that in items the acing learner is *"near the top (57 of a 62 worst case)"* (`:542`).
Meanwhile the shipped copy promises this learner specifically the opposite: *"So it stays
short… the stronger you are, the faster it climbs"*
(`apps/web/src/diagnostic/DiagnosticRunner.tsx:475-476`). **It climbs faster in nodes and
longer in items, and the learner experiences items.**

**Two things pull the other way and both are worth crediting.** The diagnostic is
**optional**, offered as one of two CTAs on the title screen
(`TitleScreen.tsx:102-111`, and `2026-07-31-game-completion-ceremony-design.md:295`), so the
57 items were chosen rather than imposed. And the repository has already ruled the framing
that makes a long instrument bearable, at **D-END9**: *"the diagnostic is the thing you DO,
and the ceremony is what happens when the results come back"*, with the sitting split rather
than the instrument shortened, because the walk is already resumable
(`2026-07-31-game-completion-ceremony-design.md:573-579`). **That ruling was made for the
era-ten retake and has never been applied to the entry diagnostic, and it should be.** It is
the cheapest item in this record: no new surface, no ruling reversed, and it is the only
thing on offer that shortens the sitting the learner actually complains about.

### 4.3 "C uses the trial backwards": half REFUTED, half CONFIRMED and already known

**Refuted: they are not the same questions.** The trial draws the era's own items and the
diagnostic draws a separate frozen walk pool, and the accuracy record says so directly:
*"the trial's items are not the diagnostic's items"*
(`2026-08-01-diagnostic-placement-accuracy.md:373`, measured on branch `05e07c11`). The two also behave
differently in the way that matters most: **D-ET13** re-queues a further item from any node
that was missed and the ceremony cannot finish while the queue is non-empty
(`2026-07-29-era-trial-contract.md:1215`), where the diagnostic decides a node and moves on.
So the second encounter is not a replay.

**Confirmed on the emotional arc, and the merged record already carries it** as the D-ET1
collision at its §5.3: D-ET1's argument is that the trial cannot be an exam because *"it
unlocks only once every node already holds mastery 2, so nothing is being discovered"*
(`2026-07-29-era-trial-contract.md:1203`), and C removes that premise by construction.

**What I can add is the beat-level version, which is sharper than the document-level one.**
D-ET8's beat one works because the ceremony is **witnessed**: *"a crowd the learner assembled
themselves is a stronger image than a crowd that was delivered"*
(`2026-07-29-era-trial-contract.md:1348-1349`). If nothing is being discovered, that crowd is
witnessing you. If something is being discovered, the same crowd is watching you. **Same art,
same code, opposite valence, and the difference is entirely in what the learner has been
told.** And §7.1 measures that for this learner the crowd is eight people, so the beat is
carrying the inverted valence on almost no image.

### 4.4 "Four ceremonies in half an hour devalues all four": CONFIRMED, and it is measurable

**Confirmed, and the merged record undersold it exactly as the brief says.** Its §5.3 calls
this *"repetition"* and notes *"repeating a ritual is how a ritual becomes a loading
screen"*, then does not put a number on it.

**Here is the number, and it is not about ceremony count. It is about sentences.** The four
advisor lines are module-level constants on `CEREMONY_BEATS`, not per-era copy
(`apps/web/src/city/eraCeremony.ts:95-120`, the `line` fields at `:99,105,111,117`), and
`EraAdvanceCeremony` renders `shown.line` off that same array
(`apps/web/src/city/EraAdvanceCeremony.tsx:542-545`). Measured in §7.1: **a four-era learner
under C reads 16 advisor lines drawn from 4 distinct strings**, inside about seventeen
minutes. Under D they read four lines from four strings.

**And D-ET3's own justification is what makes this corrosive rather than merely repetitive.**
D-ET3 rules that *"the same ritual in all ten eras, and the sameness is the point"*, and it
was re-confirmed on 2026-07-31 with the observation that in the six eras with no crisis *"the
trial is the era's only set-piece, which makes the sameness carry more rather than less"*
(`2026-07-29-era-trial-contract.md:1205`). Sameness carrying more is precisely the property
that turns four-in-a-row into a loading screen. **D-ET3 is not a defence of C here. It is the
mechanism of C's failure**, and D is what buys it back.

**One thing D-ET3 does leave open, and it is the cheap half of the fix.** D-ET3 lists what
may vary per era and *"the advisor's short speech"* is on that list. **So there is already a
ruled slot for per-era ceremony copy and nothing occupies it.** Four ceremonies with four
different speeches is a materially different experience from four with one, at the cost of
twelve sentences and no code.

### 4.5 "The feeling we want is unnamed": CONFIRMED, and it is the reason this record exists

**Confirmed.** Both existing records score against time, safety, rulings amended and art. The
merged record's own §10 admits the gap in its third bullet: what it does not establish is
*"anything about how it feels"*, and it consigns the central claim, that 42 evidential
questions read as a ceremony where 105 practice items read as a tax, to the product-hypothesis
list rather than the ruled column.

**Sharpened in one place: the lead's candidate sentence is two feelings, and they trade.**
§3.3 works that through. The consequence for the decision is that *"no option has been
evaluated against that"* is true but understated: **no option CAN score well against both
halves, so the question the lead is really being asked is which half to protect.** This record
answers protect the ceremony, and §9 says what that costs.

---

## 5. The walkthroughs

**The four-era case throughout: 21 nodes, `NUM.S` through `POL.8`, eras one to four.** Second
person, on a clock.

**The clock is a construction and here are its two assumptions, stated once.** **Twenty seconds
per answered item**, which is the rate implied by the merged record's own §5.3 (*"12 questions…
about four minutes"*), and **forty seconds per placement**, which is a guess and is not from any
record. The two together reproduce that record's own estimate for Option C, *"roughly 25 to 35
minutes from the diagnostic to real content"*, at 42 questions plus 21 placements equalling 28
minutes, which is the cross-check that the rates are its rates rather than mine. **Nothing below
was observed, because none of it can run** (§2). Every minute figure is a sum of those two
rates, so the lead can re-time the whole of §5 by changing them.

Mid-era crises are timed at three minutes each and that figure has no source at all; they appear
only in Options A and C's era four, and both are flagged where they occur.

Every walkthrough starts the same way, so it is written once:

> **Minute 0.** Title screen. A living island turns behind two buttons, *Start* and *Take
> Diagnostic*, and under them: *"New here? Take the diagnostic — skills you already know are
> built for you."* (`apps/web/src/TitleScreen.tsx:106-111`.) You pick the diagnostic, because
> of that sentence.
>
> **Minute 1.** *"Let's find your starting point."* You are told it is not a test you pass or
> fail, that there are no hints and no retries, and that *"the stronger you are, the faster it
> climbs"* (`DiagnosticRunner.tsx:504-508,467-476`).
>
> **Minutes 1 to 20.** Fifty-seven items. One at a time, no feedback, no running score. You
> get almost all of them right and the product does not tell you so, which is correct and is
> also nineteen minutes of silence.
>
> **Minute 20.** *"Diagnostic complete. You tested out of 21 of 62 skills!"*, then *"21
> buildings free · 41 to learn"*, then two grids: **Ready to build · skip the lesson** and
> **Still to learn**. One button: **Start building**
> (`apps/web/src/city/UnlockCelebration.tsx:286-293,300-301,322,351`).

Read that shared prologue as the first finding of §5. **All five options are identical for the
first twenty minutes, and for three of the five those twenty minutes are the largest single
block of the learner's time.** The five options are decisions about what happens after the
longest part is already over.

**And the contrast that makes those twenty minutes a finding rather than a fact is the cold
learner's prologue, which is six minutes.** A learner who answers everything incorrectly serves
**17** items rather than 57, because a confirmed failure prunes its dependent cone
(`2026-07-31-game-completion-ceremony-design.md:530`). At the same rate that is under six
minutes, so she is placing her first building at about minute eight and inside its lesson at
about **minute nine**. Hold that number against every figure below.

### 5.1 Option A: play it all

> **Minute 21.** You open the build menu. A tooltip says *"Drag a building onto an open
> plot."* (`coachMarksCore.ts:190-194`.) You place six buildings on a bare island in about
> four minutes. They arrive **finished, at zero stars**, which is the ratified rule
> (`docs/Contracts.md:62`). This part is good, and it is the first thing you have done rather
> than answered.
>
> **Minute 25.** You go to the Town Hall for whatever comes next. **It has nothing.** The
> trial is locked and the reason it gives is that all six of your skills are unmastered
> (measured in §7.1). A coachmark explains: *"You tested out of a skill, so its building went
> up without the lesson. Run its practice set to earn its mastery stars."*
> (`coachMarksCore.ts:213-215`.)
>
> **Minutes 25 to 35.** Thirty practice items across six buildings. Four of five correct on a
> set is mastery 2 (`Mastery_Scoring_Spec.md:11,51`). You have now answered eighty-seven
> questions today. You have not been taught anything, because you skipped the lessons, which
> was the point.
>
> **Minutes 35 to 38.** Era one's crisis, and its pool is full because you have just mastered
> the era.
>
> **Minutes 38 to 42.** Era one's trial: twelve questions, four beats. The hall rebuilds.
> **This is the best moment in any of the five walkthroughs**, because your crowd is 44 people
> and you earned every one of them (§7.1).
>
> **Minutes 42 to 87.** Eras two, three and four. Each is five placements, twenty-five practice
> items and a ten-question trial, which is fourteen minutes apiece, plus era four's crisis.
>
> **About minute 87.** Era five. Your first lesson. **You have answered 204 questions to get to
> the first thing this product was going to teach you**, which is 57 plus 105 plus 42, and the
> merged record's own figure of 147 on known material with the diagnostic added back.

**What the clock shows that the table does not.** A's defect is not the 105 items. It is that
the 105 items are the reward for placing the buildings. Every block of five placements is
followed immediately by twenty-five questions, and there is no other rhythm available for an
hour and a half. **Note also what A gets right and no other option does**: minute 38 is the only
moment in any of the five walkthroughs where this learner's ceremony has a full crowd in it.
That is the price of the 105 items, and it is a real thing bought rather than nothing.

### 5.2 Option B: hand them the finished city

> **Minute 21.** *"You tested out of four eras."* Nothing to press.
>
> **Minutes 21 to 22.** Ninety seconds. Four eras of city assemble themselves. Twenty-one
> buildings land on plots an algorithm chose. The ground turns three times. The hall rebuilds
> three times, fast. You watch.
>
> **Minute 23.** You are standing in era five. The island is a quarter full of buildings at zero
> stars, holding eight people (§7.1), in a layout you did not choose. Nothing on it is a decision
> you made. Your first lesson is available.

**What the clock shows.** B is over so fast that the objection cannot be pacing, and it is the
only option that gets this learner to real content before the cold learner's first hour is out.
**B's problem is that minute 23 is the first moment of the game and the learner has no
relationship to anything on screen.** INV-ERA-1 exists to protect a layout *"the player
arranged"* (`2026-07-27-era-progression-design.md:199-201`), and B is the one option with no
arrangement to protect.

### 5.3 Option C: the trial is the test-out

> **Minutes 21 to 25.** You place era one's six buildings. Good, and identical to A.
>
> **Minute 25.** The Town Hall offers **the final inspection**. You have been in this product
> for twenty-five minutes, you have answered fifty-seven questions, and **nothing has been
> given to you yet.**
>
> **Minutes 25 to 29.** Twelve questions, in beats of `[3, 3, 3, 3]` (§7.1). Three correct and
> your advisor says *"They are coming in from every corner of the island. Nobody wants to miss
> this."* **Eight people gather** (§7.1). Three more: *"Make room. What comes next needs more
> ground than we have cleared."* Three more: *"Now the hall itself. It has to stand for
> whoever governs next."* Three more: *"The ground, the water, what grows and the roads between.
> All of it turns now."* The island turns Neolithic. It is genuinely good, and every beat was
> caused by something you did.
>
> **Minutes 29 to 36.** Era two. Five plots. You place five buildings. The Town Hall offers the
> final inspection. Ten questions, `[2, 3, 2, 3]`. *"They are coming in from every corner of the
> island. Nobody wants to miss this."* **Eight people gather.**
>
> **Minutes 36 to 42.** Era three. Five buildings. Ten questions. *"They are coming in from every
> corner of the island."* Eight people.
>
> **Minutes 42 to 49.** Era four. Five buildings. Ten questions. *"They are coming in from every
> corner of the island."* Eight people. Era four's mid-era crisis is due, and **its question pool
> is empty**, because the pool filters `mastery >= CRISIS_MASTERY_GATE`
> (`engines/game/src/mid-era-crisis.ts:132,61`). Whether it happens at all is C's mastery clause,
> undecided, so this is minute 49 or minute 52.
>
> **About minute 50.** Era five. Your first lesson. **Ninety-nine questions answered. Sixteen
> advisor lines read, from four distinct sentences. Four town halls rebuilt for an audience of
> eight.**

**What the clock shows that the table does not, in three parts.**

1. **The first thing this product gives you arrives at about minute 50.** Everything before it
   is extraction: 57 answers, then 42 more. The city is handed over at minute 20 but nothing is
   *taught*, *explained* or *offered* until era five. **The cold learner meets the product's
   generosity at minute nine** (§5's prologue). For this learner it is forty-one minutes later,
   and she is the one it was designed to reassure.
2. **The reward for placing is a quiz, four times.** The rhythm is place, get inspected, place,
   get inspected. The merged record's *"the part the lead already likes"* is structurally the
   thing that triggers the part he might not.
3. **The repetition is legible, not subtle.** Same four sentences, same beat order, same quotas
   within one answer of each other, four times inside twenty-five minutes, with the same
   eight-person crowd gathering each time. **Minute 36 is where a learner works out that minute
   42 is going to be the same**, and there is nothing at minute 42 to prove them wrong.

### 5.4 Option D: one founding, one ceremony

> **Minutes 21 to 25.** You place era one's six buildings.
>
> **Minute 25.** The Town Hall offers something that is **not** the era-one trial. It is a
> founding: the history of this city up to the point you walked in, and you are told it is
> forty-two questions and that it ends with you standing in era five.
>
> **Minutes 25 to 49.** One continuous run. Answers arrive and things happen. Ten or eleven
> answers into it the citizens gather and the hall scaffolds and your advisor changes dress,
> once, and it is the only time you see it. Era two's five plots become placeable and you place
> them, then era three's, then era four's; each era's ground turns under you as its questions
> land. Beat two expands the island through four radii in one push. **Beat three rebuilds the
> hall four times, through four eras' materials, as one continuous act**, which is the same shape
> `REBUILD_STAGES` already gives beat three internally (`apps/web/src/city/eraCeremony.ts` and
> `EraAdvanceCeremony.tsx:534`). Beat four turns the whole island into era five.
>
> **About minute 49.** Era five. Your first lesson. **Ninety-nine questions, the same as C. Four
> advisor lines, from four distinct sentences. One town hall sequence, watched once, in which
> four halls were built.**

**What the clock shows.** The evidence total is identical to C to the question. What changes
is that the ritual happens once, which is the only thing that was ever wrong with C, and that
**the polarity of the loop inverts**: in C a placement earns you a quiz, and in D a question
earns you a building. The second is the informational reward framing the BrainLift asks for by
name, *"here is what you can now do"* (`docs/BrainLift_Game_Design.md:316`).

**And note what the clock says about the cost: there isn't one.** C reaches era five at about
minute 50 and D at about minute 49, because the evidence total and the placement count are
identical and the only thing that changed is how the same twenty-four minutes are punctuated.
**D is not a faster option or a slower one. It is the same option with one ritual instead of
four**, which is why the whole decision comes down to whether four is better than one.

**The honest cost, which is not on the clock.** Twenty-four minutes is a long single act, and
D-ET8 fixed four beats over three specifically because *"three beats over a nine-node era's
eighteen questions is six correct answers between visible changes"* was too long
(`2026-07-29-era-trial-contract.md:1210`). Four beats over 42 is 10.5. **The defence is that D's
beats are bigger objects rather than longer waits**: beat three contains four hall rebuilds where
an era's beat three contains one, so visible change per answer goes up rather than down. That is
an argument against a ruling and the lead should make it knowingly, which is exactly how the
merged record put it.

### 5.5 Option E: the reserved ceremony

> **Minutes 21 to 25.** You place era one's six buildings.
>
> **Minute 25.** *"Your city has a history before you arrived."* Something you have never seen,
> with its own art and its own music.
>
> **Minutes 25 to 42.** Twenty-one questions, one a node, and fifteen more placements. Each
> correct answer raises one building in its era's dressing while the ground and the hall turn
> underneath. The merged record calls it twelve minutes for the questions; at the rates in §5 it
> is seven for the questions and ten for the placements.
>
> **About minute 42.** Era five. Your first lesson. **Seventy-eight questions. You have never
> seen the four-beat ceremony.**
>
> **Later, at era five's trial.** The citizens gather, the scaffolding goes up, your advisor
> changes dress. **It is the first time, and it lands like it.**

**What the clock shows, and E comes out better on the clock than in the table.** E is the only
option whose art exists to say something about *this* learner, and it is the only one where
the four-beat ceremony still has its first time intact. **Its problem is not experiential, it
is evidential and it is already priced:** one item a node lets a node slip at `0.05` rather
than `0.05^2`, with no re-queue, so E is *"the one option whose evidence design is measurably
too thin for what it decides"* (`2026-08-01-diagnostic-placement-accuracy.md:394,454-456`, at
`05e07c11`). **Fix that and E becomes D with a new surface**, which is E's own argument
collapsing: it existed to cost less.

### 5.6 The failure mode of each, in one sentence a person would recognise

| | The sentence |
| --- | --- |
| **A: play it all** | *"It told me I could skip this, and then gave me the worksheet anyway."* |
| **B: hand it over** | *"It feels like watching someone else's save file."* |
| **C: the trial is the test-out** | *"By the third town hall I stopped watching."* |
| **D: one founding** | *"It thanked me once for four eras."* |
| **E: the reserved ceremony** | *"I never got the thing everyone else gets."* |
| **F: choose per era** (§8.4) | *"It kept asking me the same question and then playing the same cutscene."* |
| **G: one item per node** (§8.3) | *"It asked me one thing about each and moved on, which is about what I'd have done."* |
| **F+D+G** *(recommended, §9)* | *"It asked me what I wanted, took my word for it once per skill, and then showed me the city I'd have built."* |

**The last two rows are the point of the whole table.** Five of the seven sentences are complaints
and two are not, and the two that are not are the two that ask the learner something. **A failure
mode you cannot write is the strongest signal in this record**, and it is why §9 recommends a
combination rather than a letter.

**On C's sentence specifically, because the brief offered a different one.** *"Feels like
being tested twice"* is the sentence the lead's seat produced, and §4.1 argues it is the
weaker of C's two failure modes: it is a copy problem, fixable in a paragraph, and it is
partly false because a third of the nodes were never answered. **The one above is C's real
failure mode, it arrives at minute 36 and is confirmed at minute 42, and no copy fixes it.** That
difference is the whole disagreement in §9.

---

## 6. The four things a table cannot show

### 6.1 Order and pacing: when does the first thing they DO happen?

| Who | First thing **answered** | First thing **done** | First thing **given** |
| --- | --- | --- | --- |
| **The cold learner** (§3.1), any option | minute 1 | about minute 8 | **about minute 9** (era one's lesson) |
| **A**, four eras | minute 1 | minute 21 | **about minute 87** |
| **B**, four eras | minute 1 | **about minute 23**, and it is arriving in era five | about minute 23 |
| **C**, four eras | minute 1 | minute 21 | **about minute 50** |
| **D**, four eras | minute 1 | minute 21 | **about minute 49** |
| **E**, four eras | minute 1 | minute 21 | **about minute 42** |

**The column that matters is the third and neither record has it.** The cold learner meets the
product's generosity about a minute after she places her first building, because her diagnostic
was 17 items rather than 57 and her first lesson is the next thing that happens. **The four-era
learner meets it between fourteen and seventy-eight minutes later than she does**, and the reason
is structural rather than a pacing oversight: **everything this product has to give is a lesson,
and this learner has just proved they do not need any of the ones in front of them.**

That is not an argument for any option; the column's spread is a consequence of test-out reaching
further, and it is B that scores best on it. **It is the reason §7.2 matters**, because material
and citizens are the only two things the product can hand over that are not a lesson, and both
are currently withheld from exactly this learner by rulings made for good reasons elsewhere.

**The cheap fix is not on the option axis at all.** §4.2's D-END9 precedent splits the sitting
rather than shortening the instrument, and applied to the entry diagnostic it moves *"minute
21"* off the same evening as *"minute 1"*. It costs no ruling and no art.

### 6.2 Agency: 21 decisions, and where they sit

**Every option except B gives the learner all 21 placements.** The brief is right that this is
not the same as 21 decisions, and the walkthroughs show three different objects:

- **A and C: four blocks, each followed by a quiz.** Place six, answer twelve. Place five,
  answer ten. Three more times. The decision is bracketed by assessment on both sides, and
  the placement is what unlocks the questions.
- **D: 21 decisions distributed through one act, each bought by answers.** The question earns
  the building. Same count, opposite polarity, and no block of placements is ever the thing
  that triggers a block of questions.
- **E: 21 decisions, one a question, inside a purpose-built surface.** The tightest coupling of
  the five and the thinnest evidence behind each.
- **B: zero.** And it spends the learner's one aesthetic choice on their behalf, using an
  auto-layout that has to be written to do it.

**What no option varies is the decision's stakes, and they are near zero in all of them.**
Layout is protected by INV-ERA-1 forever (`2026-07-27-era-progression-design.md:199-201`) and
nothing reads it: no gate, no score, no consequence. That is deliberate and correct for the
anxious persona. **For this learner it means the one thing they get to decide is the one thing
that does not matter**, and that is worth the lead knowing before he picks an option on agency
grounds. Nothing here proposes making layout consequential; INV-COS-1 and INV-ERA-3 exist to
stop exactly that.

### 6.3 What they are told about themselves

**The standing rule, and it is a real rule with a real number.** **R33**: *"Copy after a miss
does not lead with the penalty, and does not instruct on what should have been done"*
(`.cursor/skills/author/SKILL.md:1084-1089`), with a scoping caveat at `:1091-1096` that the
unscoped version would ban wording R13 requires. R33 is about a miss. **There is no
counterpart rule for copy after a pass, and that is the gap this section is about.**

**What is shipped today, in full, because it is the only test-out copy that exists:**

| Surface | Words | Line |
| --- | --- | --- |
| Unlock reward, eyebrow | *"Diagnostic complete"* | `UnlockCelebration.tsx:286` |
| Unlock reward, headline | *"You tested out of 21 of 62 skills!"* | `:288` |
| Unlock reward, subline | *"21 buildings free · 41 to learn."* | `:291` |
| Section headings | *"Ready to build · skip the lesson"*, *"Still to learn"* | `:300-301,322` |
| Card badges | *"No lesson needed"*, *"Build by finishing its lesson"* | `:134` |
| CTA | *"Start building"* | `:351` |
| Coachmark | *"You tested out of a skill, so its building went up without the lesson. Run its practice set to earn its mastery stars."* | `coachMarksCore.ts:213-215` |

**Two of these are wrong for this learner and one is a model to copy.**

- **The exclamation mark and *"buildings free"* are the boast register**, and *"free"* is
  transactional in a product whose ranked feature list says every completion must read as
  *"here is what you can now do,"* never *"you earned 50 coins"*
  (`docs/BrainLift_Game_Design.md:316`). *"Free"* is the coin sentence with the coin removed.
- **The coachmark instructs a learner who has just proved they do not need instruction.**
  *"Run its practice set to earn its mastery stars"* is R33's second clause pointed at a pass
  instead of a miss: it tells them what to do about an outcome that was already good. It is
  also, in its own comment, *"the honest test-out copy"* (`coachMarksCore.ts:211-212`), and it
  is honest. Honest and slightly patronising are compatible, which is the problem.
- **The model to copy is D-END5's.** Its cold-confirmation line is *"you sat down today with
  no lessons, no hints and no retries, and these held"*
  (`2026-07-31-game-completion-ceremony-design.md:323-324`). **That is the answer to the
  brief's question.** It is not a consolation prize, because it makes a positive claim about
  something that actually happened. It is not a boast, because it states the conditions and
  stops, and the learner draws the conclusion. And the reasoning behind it generalises exactly:
  the two forms of that ceremony *"are not a good one and a consolation prize, they are the
  same ceremony with and without a second data point"* (`:329-333`).

**So the shape of a test-out message, derived rather than invented.** Name the conditions.
State what held. Say what is now open. Do not price it, do not congratulate, do not instruct.
Applied to the four-era case: *"You answered fifty-seven questions with no hints and no
retries. Twenty-one skills held. Their buildings are yours to place, and the lessons behind
them are open if you ever want them."* The last clause is doing real work: **INV-COS-1
guarantees nothing gates learning and test-out never removed the lesson, it only stopped
requiring it** (`2026-08-01-test-out-placement-experience.md` §5.3), so that sentence is true
and it is the one that makes the message an offer rather than a verdict.

**And the trial's copy has to differ between the two learners it now serves**, which the merged
record already names as an authoring requirement rather than a reassurance. A learner who
mastered the era is being witnessed. A learner who tested out of it is being checked. §4.3
argues they are looking at the same crowd.

### 6.4 The anxious learner, and the learner who is her opposite

**The brief's question is whether the product's whole tone is calibrated for someone who needs
reassurance while this learner needs not to be patronised. Confirmed, and the calibration is
single.**

There is one persona: *"Maya… underprepared, not incapable… math-anxious, has been burned by
timed tests and walls of text… abandons anything that feels like a worksheet"*
(`docs/Game_Visual_Design_Brief.md:50-55`). Everything downstream is built for her. The tone
requirements are *"Calm and non-punishing"*, *"Failure is never a loss"* and *"like a cozy
diorama you are tending, not a dashboard you are being graded on"* (`:59-64`). The bans are all
bans on pressure: no urgency timers framed as pass/fail, no streak-loss guilt, no artificial
scarcity, no energy gates (`:68-72`). The ranked features carry it too: *"'locked' must read as
'not yet,' not 'you failed'"* and *"'still building this skill' language"*
(`docs/BrainLift_Game_Design.md:319,324`).

**A tested-out learner is not that person in the first half.** They are not underprepared.
They came to find out whether they need this, and the answer for four eras of it is no.

**But the correct conclusion is not a second register, and this is the sharpening.** Read the
bans again: every one of them bans *pressure*, and **not one of them requires reassurance.**
*"Calm and non-punishing"* is fully compatible with matter-of-fact. What the shipped copy does
is conflate **soothing** with **respectful**, and it is the soothing that grates on a confident
learner, not the calm.

**The tell is the first sixty seconds, which carries three separate reassurances and no
information this learner did not have.** *"skills you already know are built for you"*
(`TitleScreen.tsx:111`), then *"It's not a test you pass or fail"*
(`DiagnosticRunner.tsx:506-507`), then *"No hints, no retries, no grades along the way"*
(`:467-468`). The pass-or-fail line appears exactly once in the tree, so this is a pattern of
register rather than a repeated sentence, and the register is aimed at somebody who was worried.
**Under Option C the middle one also becomes false**, because the trial is in fact the thing
that decides.

**So the fix is subtraction rather than a second voice.** Say less about how the learner should
feel and more about what is true, which is D-END5's register and R33's shape. **Two concrete
consequences for the option choice**: C's trial copy has to stop calling itself a *final
inspection* for a learner at mastery 0, because for them it is not final and it is not merely
an inspection; and every option's opening line has to survive being read by somebody who is not
nervous.

**One risk in the other direction, recorded so this is not one-sided.** A learner can be
confident and wrong: the accuracy record measures era-one fail-open at 2.0% at the full scope
(`2026-08-01-diagnostic-placement-accuracy.md:210`, measured on branch `05e07c11`), so roughly one in fifty
learners handed era one meets a stall on a node they do not know. **Copy written to avoid
patronising the strong learner is read by that learner too**, and D-ET12's locked beats and
D-ET14's end-of-attempt screen are what has to catch them
(`2026-07-29-era-trial-contract.md:1214,1216`). Respect and a soft landing are not in tension;
congratulation and a soft landing are.

---

## 7. Two findings neither record has, measured at the tip

Both were driven through the real functions with a throwaway harness at
`engines/game/sim/testout-experience.sim.test.ts`, outside every vitest project's include
glob, **deleted after the run**, following the merged record's own precedent for its §2 and
§7.1. Outputs are quoted literally.

**Three further harnesses were added in the later revisions and deleted the same way**,
`shortened-trial.sim.test.ts`, `option-f-pacing.sim.test.ts` and `stopping-point.sim.test.ts`, whose
output is quoted in §8.3, §8.4 and §10.9 to §10.13. All three ran under a throwaway `vitest.sim.config.ts` on the pattern
`engines/diagnostic/sim/` established (`engines/diagnostic/README.md:135-140`), so none of them
was ever collectable by `npm run test:unit`.

### 7.1 Beat one is eight people, and it corrects the merged record

```
===== ERA SIZES AND TRIAL LENGTHS =====
  prehistoric       nodes=6  checks=12  quotas=[3, 3, 3, 3]  cumulative checks=12
  neolithic         nodes=5  checks=10  quotas=[2, 3, 2, 3]  cumulative checks=22
  bronze_age        nodes=5  checks=10  quotas=[2, 3, 2, 3]  cumulative checks=32
  classical         nodes=5  checks=10  quotas=[2, 3, 2, 3]  cumulative checks=42
  medieval          nodes=5  checks=10  quotas=[2, 3, 2, 3]  cumulative checks=52
  renaissance       nodes=6  checks=12  quotas=[3, 3, 3, 3]  cumulative checks=64
  industrial        nodes=6  checks=12  quotas=[3, 3, 3, 3]  cumulative checks=76
  atomic_age        nodes=9  checks=18  quotas=[4, 5, 4, 5]  cumulative checks=94
  information_age   nodes=6  checks=12  quotas=[3, 3, 3, 3]  cumulative checks=106
  cyberpunk         nodes=9  checks=18  quotas=[4, 5, 4, 5]  cumulative checks=124

===== TRIAL QUESTION TOTALS =====
  first  1 eras: nodes= 6  trial questions= 12  practice items (5/node)= 30  ceremonies under C=1  under D=1
  first  2 eras: nodes=11  trial questions= 22  practice items (5/node)= 55  ceremonies under C=2  under D=1
  first  4 eras: nodes=21  trial questions= 42  practice items (5/node)=105  ceremonies under C=4  under D=1
  first  9 eras: nodes=53  trial questions=106  practice items (5/node)=265  ceremonies under C=9  under D=1
  first 10 eras: nodes=62  trial questions=124  practice items (5/node)=310  ceremonies under C=10  under D=1

===== BEAT ONE'S CROWD =====
  era one           nodes= 6  tested-out (mastery 0)=8  practised (mastery 1)=20  mastered (mastery 2)=44
  eras one to four  nodes=21  tested-out (mastery 0)=8  practised (mastery 1)=50  mastered (mastery 2)=134
  eras one to nine  nodes=53  tested-out (mastery 0)=8  practised (mastery 1)=114  mastered (mastery 2)=326

===== ERA TRIAL UNLOCK, TESTED-OUT LEARNER, ERAS ONE TO FOUR =====
  prehistoric       unlocked=false  unmastered=6 [NUM.S,NUM.F,NUM.2,NUM.3,NUM.4,NUM.5]
  neolithic         unlocked=false  unmastered=5 [EXP.1,RAD.1,RAD.2,RAD.3,RAD.4]
  bronze_age        unlocked=false  unmastered=5 [LIN.1,LIN.3,LIN.4,LIN.5,LIN.6]
  classical         unlocked=false  unmastered=5 [POL.1,POL.2,POL.3,POL.4,POL.8]

===== ADVISOR LINES A FOUR-ERA LEARNER READS UNDER C =====
  4 ceremonies x 4 beats = 16 advisor lines, drawn from 4 distinct strings
    gathering  "They are coming in from every corner of the island. Nobody wants to miss this."
    expansion  "Make room. What comes next needs more ground than we have cleared."
    rebuild    "Now the hall itself. It has to stand for whoever governs next."
    retheme    "The ground, the water, what grows and the roads between. All of it turns now."
```

**Three things in that output, in order of what they cost.**

**First, and it is a correction.** The merged record's §3 beat-one row reads *"A tested-out node
scores the first term and **not** the second, so the tested-out learner's gathering is short by
one term per node."* At the tip it scores **neither term**. `buildingLedger` computes
`complete = node.placed && constructionState === "complete" && node.mastery >= PRACTICED_MASTERY`
and `mastered = complete && node.mastery >= 2`
(`engines/game/src/citizens-population.ts:176-178`), and `PRACTICED_MASTERY` is
`masteryFromCorrectCount(0)`, so a scored set is the floor
(`packages/shared-mastery-service/src/index.ts:99`). **The mastery floor on the first term
landed 2026-07-30 and the file says why in its own words:** a passed placement *"used to bring
CITIZENS_PER_COMPLETE_BUILDING people. It now brings none until the learner scores a set"*
(`citizens-population.ts:52-63`). So the population is `FOUNDING_POPULATION` alone, which is 8
(`engines/game/src/citizens-tuning.ts:54,66,74`).

**Second, what that does to the ceremony.** Beat one is *"The city gathers"* and its line is
*"They are coming in from every corner of the island. Nobody wants to miss this."* For this
learner, on this island, **there is no city to gather.** Eight founding citizens, in every era
count from one to nine, against 44 for a cold learner at the same moment. The ruling that
produced this is defensible on its own terms and the file argues it well: *"A tested-out
learner is not punished… one scored set brings the people the pre-build used to hand over."*
**As an economy rule that is right. As the opening image of the ceremony the whole decision is
about, it is a beat with almost nothing in the frame**, and no table in either record shows it.

**Third, it puts a sequencing question inside C's mastery clause that nobody has asked.** If
the clause writes mastery on the clean pass at the end, beat one shows eight people and beat
four ends with 44, so the crowd appears **after** the beat that is about the crowd. If it
writes per node as the trial covers it, the crowd grows as they answer, which is a better
ceremony and a different write path. **Neither record decides this, and it decides what beat one
looks like.** Carried as **O-TX2**.

### 7.2 The tested-out learner arrives broke, by ruled design

```
===== THE MATERIAL A TESTED-OUT NODE FORGOES =====
  prehistoric       lessonMaterialAmount= 100 x 6 nodes =   600 (era total 600 at era-one scale)
  neolithic         lessonMaterialAmount= 240 x 5 nodes =  1200 (era total 600 at era-one scale)
  bronze_age        lessonMaterialAmount= 480 x 5 nodes =  2400 (era total 600 at era-one scale)
  classical         lessonMaterialAmount= 960 x 5 nodes =  4800 (era total 600 at era-one scale)
  eras one to four, material forgone until practised: 9000
  era one alone: 600 against era one's 540-stone livability/happiness target; a tested-out learner holds 0
```

**Read the 9,000 as four separate 100% figures rather than as one total**, because materials do
not convert forward and each era's numbers are at its own multiplier
(`packages/economy/src/materials.ts:338-339`). The claim is not that a number is large. It is
that **the fraction is one**: a tested-out learner forgoes their era's entire lesson channel,
in every era they tested out of.

**Why, and it is a ruling rather than a gap.** Row 1 pays a node that *"has CLEARED THE MASTERY
BAR and there is PRACTICE EVIDENCE for it"*, and the docblock's own heading is *"currency
rewards competence, not attendance"* (`apps/web/src/economy/useEconomy.ts:75-85`). The
`practiced` conjunct is kept **specifically** to close the test-out seam, named as G4, because
testing out pre-builds a node before the learner has answered one item
(`:96-107`). The population floor in §7.1 was added for the matching reason, so the two
ledgers agree.

**What it costs experientially, which is the part that is new.** Era one's cosmetic and civic
catalogue is priced at **540** at era-one scale against a lesson channel of 600
(`2026-07-29-era-resource-model-design.md:829`). A tested-out learner holds **zero** of it. So
at minute 21 they are handed six finished buildings and cannot lay a single road tile, which
costs 5 (`apps/web/src/city/roads.ts:34`), cannot buy a decoration, and cannot raise
livability. **The learner who proved the most has the least to spend**, and the tutorial
already knows this in a different form: the roads coachmark keys off a gold stockpile rather
than a placed count precisely because a placed count *"staggers nothing for them"*
(`apps/web/src/city/coachmarks/coachMarksCore.ts:183-186`, and the reasoning at `:48-63`).

**The only faucet left is Row 2, interleaved practice, and it is repeatable and capped**
(`packages/economy/src/constants.ts:230-240`). **So the economy's answer to a tested-out learner
is: go and practise the skills you tested out of.** That is either exactly SPOV 4 (*"the reward
for mastering a building is being made to use that skill again later"*,
`docs/BrainLift_Game_Design.md:52`) or exactly the busywork SPOV 3 forbids, and which one it is
depends entirely on whether the product offers it or requires it. **Nobody has decided which,
and it lands on every option including doing nothing.** Carried as **O-TX3**.

**Two things this finding is not.** It is not an argument to pay a tested-out node, which would
break the seam two ledgers were changed to close. And it is not an argument against any
particular option, since it is a consequence of test-out reaching further at all. **It is an
argument that the option choice is not the whole decision**, and it is the strongest one in this
record.

---

## 8. Is there a sixth option? THREE AXES, and the first derivation only swept one

**This section was wrong in its first draft and the error is the useful part.** It swept one axis,
found it full, and concluded the space was exhausted. **A derivation over one axis cannot conclude
anything about a space with three**, and the giveaway was that the derivation never asked what the
axis WAS. §8.1 and §8.2 are the first draft's own output and stand. §8.3 to §8.6 are what the
other two axes generate.

| Axis | Values the five options take | Swept by |
| --- | --- | --- |
| **Ritual count**, how many ceremonies the run is cut into | k (A, C), 1 (D), 0 (B, E) | The first draft, below. **Genuinely closed**, and the derivation holds |
| **Question count**, how much confirming the run asks for | 147 (A), 42 (C, D), 21 (E), 0 (B) | **Not swept.** Nothing in §8's three constraints touches it, and the options already vary on it by a factor of seven. Reviewer's axis. §8.3 |
| **Who decides, per era** | Nobody, in all five | **Not swept, and not even visible from the first two.** The team lead's axis. §8.4 |

**The reason the third axis was invisible is worth naming, because it is a general failure and
not a slip.** Every one of the five options is a *policy the product applies to a learner*. Asked
to generate a sixth from a learner-first reading, I generated more policies. **The learner-first
move was to ask who holds the decision, and a policy space cannot contain that question**: it is
a question about the space rather than a point in it.

**And there is a fourth thing, which is not an axis but a baseline correction, and it moves more
than any of the axes: the ruled state is already Option B.** §8.5.

### 8.0 The first draft's derivation, which stands for its own axis

**Three ruled properties make a tested-out run contiguous, in era order, with one marker.**

| Property | Where | What it forbids |
| --- | --- | --- |
| Era order is array position in `ERA_SEQUENCE` and nothing else | `packages/skill-graph/src/eras.ts:16` | Reaching era five before eras two to four. So the run cannot be deferred behind the content the learner actually came for |
| Exactly one building tracks the present, and it is the chapter marker | `2026-07-27-era-progression-design.md:1655` | Replaying era two's hall rebuild later, since the hall is already era five's. So the founding cannot be made optional or elective content |
| The buildable radius is per era and fail-loud on an unauthored one | `packages/skill-graph/src/eras.ts:331-339` | Placing era four's buildings on era one's island. So the 21 placements cannot be one free-form act |

**Together they mean the run must be traversed contiguously, in order, in one pass, which leaves
exactly one free variable: how many rituals the pass is cut into.** For a k-era run that variable
is an integer from 0 to k, and the five options take the three values that mean anything: **k**
(A with the teaching, C without), **1** (D), and **0** (B with nothing, E with a substitute).

**The intermediate values are available and empty, which is the part worth showing rather than
asserting.** One ritual per two eras is arithmetically fine and marks nothing: there is no
boundary in the model at "every second era", so a ceremony there is a ceremony for an event that
did not happen, and D-ET2 makes the ceremony **be** the hall rebuilding into the next era's
landmark (`2026-07-29-era-trial-contract.md:1204`), so it cannot fire anywhere but an era
boundary. **So the axis has three live values and all three
are taken. A sixth option would have to break one of the three constraints above, and each of
them is load-bearing for the whole era model rather than for this decision.**

**And the learner-first move that looked most promising is the one the constraint kills.**
§1's finding 2 shows SPOV 4's own evidence base asking for spacing, and the obvious
learner-first option is therefore to spread the four eras' rituals across four sittings and
fill the gaps with real content. **There is no real content to fill them with**, because era
five is unreachable until eras two to four advance, so *"spread over sittings"* degenerates into
a cooldown, and a cooldown is banned twice over: the visual brief forbids energy gates and
artificial scarcity (`docs/Game_Visual_Design_Brief.md:68-72`), and D-ET5 rules that a setback
may cost *"never a cooldown, a fee or a resource"* (`2026-07-29-era-trial-contract.md:1207`).
**So the era model forces the massing, and the honest conclusion is that this decision cannot
buy spacing at any price. It can only choose how the massed run is punctuated.**

**What THAT axis generates is one refinement and one requirement, both costed below. What it does
not generate is a sixth option, and that part of the first draft's claim survives: on the
ritual-count axis alone there is no sixth value.** The error was believing that settled the
question.

### 8.1 The refinement: D at building granularity rather than era granularity (D-b)

**What changes.** D as written has *"each era's five or six buildings becoming placeable as
that era's questions are answered"*, so the unit is the era's batch. **D-b makes the unit the
building**: you pick a plot, place a building, answer its two items, and it rises. Twenty-one
times, with the four run-spanning beats firing on cumulative correct answers exactly as in D.

**Why it came out of the walkthroughs.** §5.3 and §5.4 differ in polarity: under C a placement
earns you a quiz and under D a question earns you a building. D-b is that polarity at the
finest granularity the ruled parameters allow, and two items a node is exactly D-ET10
(`2026-07-29-era-trial-contract.md:1212`), so it needs no new evidence rule.

**Cost against the existing records.** **Identical to D**, with one addition and one saving.
Same evidence total (42), same rulings (D-ERA16, D-ET1 narrowed, D-ET8's beats spanning a run,
D-ET3, plus the mastery clause), same absence of new art
(`2026-08-01-test-out-placement-experience.md` §5.6, §8). The addition is per-node gating of a
placement, which is small. **The saving is real, and it is O-TO5**, the merged record's open question about a partly
tested-out era: a node that did not pass simply is not in the founding, it is a lesson, in the
ordinary way, and the founding covers its siblings. That is worth stating carefully rather than
claimed as free. **What D-b removes is the need for a rule about what a partly tested-out era's
CEREMONY says, because there is no per-era ceremony to say it.** What it does not remove is the
ordering question, since the lesson for the failed node has to be available before the founding
reaches that era's ground, and nothing here decides whether the founding waits or the plot simply
stays empty. **That is a smaller open question than O-TO5 and it is a different one.** The
accuracy record's §7 is the reason to prefer the per-node unit at all: C's saving is per node and
survives the era conjunction failing
(`2026-08-01-diagnostic-placement-accuracy.md:409-425`, measured on branch `05e07c11`), and the typical eligible
learner owes about two nodes rather than an era.

**Why it is a refinement and not a sixth option.** It sits at the same value of the only free
variable: one ritual. Presenting it as a sixth would be inflating a granularity choice into a
structural one.

### 8.2 The requirement: the founding is authored for this learner, not the cold one

**No option carries this and every option needs it.** Under C a four-era learner reads sixteen
advisor lines drawn from four strings written for somebody who spent an era there (§7.1). Under
D they read four. **In both cases the sentences are wrong for them**, and *"They are coming in
from every corner of the island. Nobody wants to miss this."* said over eight founding citizens
in minute 25 of a first session is a sentence the learner can feel is false.

**The pattern to follow already exists and it is D-END5's: different, not degraded.** That
ruling gives a learner without a comparable pair *"a DIFFERENT ceremony, never a degraded one"*
(`2026-07-31-game-completion-ceremony-design.md:756`), and its argument is that the two forms
*"are not a good one and a consolation prize, they are the same ceremony with and without a
second data point"* (`:329-333`). **Applied to the chapter break: one founding for four handed
eras is not four ceremonies degraded to one. It is the ceremony a learner who did not live those
eras gets, and it is the accurate one.** The merged record cites D-END5 at its §7.2 for the
completion ceremony's routing and never applies the pattern to the chapter break, which is the
single largest thing missing from it.

**Cost.** **No new art and no new logic.** D-ET3 already permits *"the advisor's short speech"*
to vary and nothing occupies that slot (`2026-07-29-era-trial-contract.md:1205`). What is owed
is authored copy: a founding frame, four beat lines, and an end screen, plus the two-register
trial copy the merged record already names. **It has no owner today**, which is the honest cost,
and it is smaller than any option's engineering.

### 8.3 Option G: one item per node, with the re-queue intact

**The axis.** Question count, which the first derivation did not sweep. The lead's objection to D
is that *"even then the user gets annoyed at having to do it"*, and he is right that D does not
answer it: **C and D ask the same 42 questions**, so D changes the packaging and nothing about the
volume.

**The precedent is this product's own and it is exact.** The diagnostic already made confirmation
**proportionate to consequence**: **INV-DIAG-7** and **INV-DIAG-8**
(`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md:76-77`) rule that a decision whose cone
reaches a defined share of the scope buys the 2-of-3 or the robust pass, and *"a failure whose cone
falls below that share may be taken on a single scorable item, because there is no subtree for it
to remove."* That took the full scope **from 82 to 38 median items** at a truth-accuracy cost of
**97.9% to 95.6%** (`:3`).

**Applied properly, the precedent supports Option G, and the reason is sharper than "the learner
already supplied evidence".** INV-DIAG-8's test is *what the decision credits*. The diagnostic's
pass credits a whole prerequisite closure by inference, which is why it buys two. **The trial
infers nothing, because it is coverage rather than a sample** and the shipped constant says so in
its own docblock: *"The trial is COVERAGE, not a sample… A sampled gate could only ever name the
skills it happened to draw, so the missed-skill report would be unsound"*
(`engines/game/src/era-trial.ts:71-80`). A trial answer on node X credits exactly X. **By the
precedent's own test that is a closure of one, which is the case it says may fire on a single
item.**

**Two things that make this cheaper than it looks.**

- **`ERA_TRIAL_ITEMS_PER_NODE = 1` is the SHIPPED constant** (`engines/game/src/era-trial.ts:80`),
  and `eraTrialSizing` composes the engine's blueprint at that value
  (`:112-123`). D-ET10's two landed in the web ceremony's `CEREMONY_ITEMS_PER_NODE`
  (`apps/web/src/city/eraCeremony.ts:200`), which is what `EraAdvanceCeremony` reads. **So the
  tree holds both values in two composers**, and Option G is the engine's number rather than a new
  one.
- **The merged record's Option E is mislabelled as a "sample" and it is not one.** 21 questions
  over 21 nodes is one item per node, which is full coverage at depth one. #386 priced E on depth
  (`0.05` against `0.05^2`), which is right; the word is loose, and it matters because "sample"
  is what the shipped docblock rules against while depth-one coverage is not.

**And the precedent's real lesson is the one that costs, so here is the price, re-derived rather
than assumed.**

```
=====[7] DETECTOR RATE, re-derived at guess=0.05 =====
  1 item(s)/node: P(unknown node never missed)=0.050000  detector=95.00%
  2 item(s)/node: P(unknown node never missed)=0.002500  detector=99.75%
  1 item(s)/node: residual silent advance in era one = 0.1000%  = 1 in 1000
  2 item(s)/node: residual silent advance in era one = 0.0050%  = 1 in 20000
  Option B (no trial at all): 2.0% = 1 in 50
```

**The re-queue does not recover it, and the premise that it would is the one thing in the brief I
have to refute.** The reviewer's reading was that *"the detector property comes from the
re-queue"*, so one item plus the re-queue would be a different design from Option E's one item
without it. **It is a different design, and not on this axis.** D-ET13 fires **on a miss**
(`2026-07-29-era-trial-contract.md:1215`), and the case that slips is the case where the learner
guessed right and there was no miss to re-queue. #386's own table says which mechanism buys what,
in its `from` column: the 99.75% is attributed to `0.05^2`, *"D-ET10's two items per node"*, while
the re-queue is credited with the **~20 expected items** and with **P(the ceremony finishes with X
never answered correctly) = 0** (`2026-08-01-diagnostic-placement-accuracy.md:356-362`, at
`05e07c11`). **So the re-queue governs what happens after detection, and the item count governs
detection.** Option G is 20x more permeable than C or D and the re-queue changes nothing about
that. What the re-queue *does* buy Option G is the same thing it buys C and D: a detected
over-placement is localised to the node and cannot be escaped.

**OT-14, resolved rather than assumed, and it points neither way.**

```
=====[8] OT-14: pool exhaustion under the re-queue, guess=0.05 =====
  D-ET13's chain ends at the FIRST correct answer (#386 §5), and the plan's own slots are drawn from the same pool under "an attempt never repeats an item", so the
  budget is the whole pool at EITHER per-node count. Expected draws on a node the learner does not know = 20.0.
  pool=35 distinct items:  P(exhaust before one correct)=16.61%  identical at 1/node and 2/node
  pool=41 distinct items:  P(exhaust before one correct)=12.21%  identical at 1/node and 2/node
  pool=47 distinct items:  P(exhaust before one correct)=8.97%  identical at 1/node and 2/node
```

Three things follow, and the second is the one that matters.

1. **Halving does not lower the release gate by one item.** §14.3's floor is
   `max(PRACTICE_SET_SIZE, ERA_TRIAL_ITEMS_PER_NODE)` and that document says in its own words
   that *"`PRACTICE_SET_SIZE` is 5 and `ERA_TRIAL_ITEMS_PER_NODE` is 1 … so A binds and B is
   currently slack"* (`2026-07-29-era-trial-contract.md:1043-1051`). Measured: the floor is **5 at
   1 per node, 5 at 2, and 5 at 5**, and the trial's term binds only above 5. **So the worry that
   shortening the floor thins the pool is unfounded: the trial's term is not the floor at either
   value.**
2. **OT-14 is much more live than its own wording suggests, and it is identically live at both
   counts.** *"A determined miss streak"* reads as a tail. Re-measured pool depths at the tip are
   **35 to 47 distinct items** across 39 nodes and 1,401 frozen items, and against a 0.05 guess
   rate the chance of exhausting a 35-item pool before one correct answer is **16.6%**. That is
   not a tail. **It is unaffected by the per-node count**, because the plan's slots and the
   re-queue draw from the same pool under the same no-repeat rule, so the budget is the whole pool
   either way.
3. **The stale figure was worth re-measuring.** §5's note recorded *"29 to 41 distinct items
   each"* at `80760dd`; at the tip the range is **35 to 47** with a median of 35 and a histogram
   of `35x35 41x2 47x2`. The floor moved up by six, which weakens the exhaustion worry slightly
   and does not remove it.

**OT-2, and this is where Option G's real constraint is.**

```
=====[9] WHICH PER-NODE COUNT LANDS INSIDE THE RULED PACING BAND =====
  Accepted by D-ET10/D-ET8: 2.50 to 4.50 answers/beat (10 to 18 questions over 4 beats).
  Rejected by D-ET8: 6.00. Flagged by OT-12: 1.50.
  k=1  nodes= 6  1/node 1.50 OT-12   |   2/node 3.00 INSIDE
  k=2  nodes=11  1/node 2.75 INSIDE   |   2/node 5.50 edge
  k=3  nodes=16  1/node 4.00 INSIDE   |   2/node 8.00 OVER
  k=4  nodes=21  1/node 5.25 edge   |   2/node 10.50 OVER
  k=5  nodes=26  1/node 6.50 OVER   |   2/node 13.00 OVER
```

**Read the top two rows against the bottom three and the answer falls out: the per-node count and
the ritual count are not independent knobs, they are one knob measured twice.**

- **At ERA granularity (C's packaging) Option G breaks OT-2 and makes OT-12 universal.** One item
  per node is 1.25 answers a beat in a five-node era and 1.50 in a six-node era, and OT-12 exists
  because 1.50 is *"barely a beat"* (`2026-07-29-era-trial-contract.md:1240`). OT-12 was filed as
  a hypothetical about a three-node era nobody has authored. **At one item per node it is every
  authored era.** And `ERA_TRIAL_MIN_ITEMS = 5` stops being slack: measured, a three-node era's
  raw count of 3 falls under the floor, where two per node clears it.
- **At RUN granularity (D's packaging) Option G FIXES D's only measured defect.** D's 42 questions
  over four run-spanning beats is 10.50 a beat, which is over the 6.00 D-ET8 rejected. **Option G
  at four eras is 5.25**, which is under it. So **the two proposals are not orthogonal and they
  are not rivals: each repairs the other's named flaw.** D fixes G's beat starvation by widening
  the span; G fixes D's beat sparsity by halving the count.
- **Both break down past five eras**, at 6.50 a beat and worse, which is the same k=9 wall §3.4
  already named.

**Cost, in the same currency as the others.** Rulings: **D-ET7** (which ruled against one item per
node *in direction*, `:1209`) and **D-ET10** (which ruled against it *in value*, `:1212`) both need
reversing, plus **OT-12** needs closing rather than carrying. That is two ruling reversals and one
open question, on top of whatever packaging it sits in. **No new art. No new logic**, since the
engine's composer already builds at this value. **Time: 7 minutes of questions rather than 14.**

**The failure mode in one sentence.** *"It asked me one thing about each and moved on, which is
about what I'd have done."*

**Is a shorter trial defensible, or does it read as second-class?** **Respect, and the reason is
sequencing rather than framing.** A learner has no basis to call something abridged unless they can
compare it, and this learner's comparison arrives **after**: their founding is one item a node,
and era five's trial, their first lived era, is the ordinary two. **So their sequence is
confirmation and then culmination, which reads as the game getting bigger rather than as them
getting less.** That is D-END5's pattern holding on its own terms: a confirmation is a different
claim from a culmination, so a shorter confirmation is not a degraded culmination. **It is
conditional on one thing**, and it is the same condition §8.2 already owes: the founding must be
named as a confirmation. Called *"the era trial, shorter for you"* it is abridged. Called a
founding, it is a different object with a bigger thing after it.

### 8.4 Option F: the lead's design, walked and measured

**His words, and the restatement he asked me to correct.**

> *"the game goes through each of the eras from the beginning, and give the user three options
> within the era: reject the pre-seed completely and allow the user to start at that era as if
> they'd been placed in it (if they feel weak in the content or they just want to see the
> progression), accept it and place all the buildings / cosmetics/roads yourself, or have the game
> do it for them. once theyre happy with their era, we do the same 4-beat ceremony just without the
> questions - they still get to see the era progress and all the citizens gather and the
> retheming happens, so they still get the progression feel. this process repeats until they catch
> up to the era theyre actually placed in"*

**The restatement is correct in all four parts and I found nothing to correct in it.** One thing
should be added rather than corrected: **two of the three nouns in choice two are not available
today.** Roads cost 5 material a tile (`apps/web/src/city/roads.ts:34`) and this learner has none
of the era's channel (§7.2), and a cosmetic is **visually inert**. Re-verified at the tip: no file
under `apps/web/src/city/` reads the equipped map, so *"a purchased cosmetic changes nothing on the
island"* (`2026-08-01-game-feel-mechanics-backlog.md:1046-1051`). **So "place all the buildings,
cosmetics and roads yourself" is, today, "place all the buildings yourself."**

#### The walkthrough, four-era learner, on §5's clock

> **Minutes 0 to 21.** §5's shared prologue, unchanged. 57 items, then *"You tested out of 21 of
> 62 skills!"*
>
> **Minute 21.** Era one. Three cards. *Start here instead. Build it yourself. Let the city build
> itself.* You read them, and this is the first moment in any of the six walkthroughs where the
> product asks you something rather than telling you. **It is the best thirty seconds on the
> table.**
>
> **Minutes 21 to 26.** You pick *build it yourself* and place six buildings.
>
> **Minutes 26 to 27.** The ceremony, with no questions in it. The citizens gather, which is
> **eight people** (§7.1). The island expands. The hall rebuilds. The age turns. *"They are
> coming in from every corner of the island. Nobody wants to miss this."* Ninety seconds, on a
> clock, because there is nothing you did that it could be waiting for.
>
> **Minutes 27 to 32.** Era two. Three cards again, in the same three positions, saying the same
> three things. You pick the same one you picked last time. Five buildings. Ninety seconds.
> *"They are coming in from every corner of the island."* Eight people.
>
> **Minutes 32 to 38.** Era three. Three cards. Five buildings. Ninety seconds. *"They are coming
> in from every corner of the island."*
>
> **Minutes 38 to 43.** Era four. The same. **You have now made the same choice four times and
> watched the same ninety seconds four times.**
>
> **About minute 43.** Era five. Your first lesson. **Fifty-seven questions, none of them since
> minute 20. Sixteen advisor lines from four distinct sentences, in twenty-two minutes.**

#### What the measurements say, and two of the four go against F

```
=====[1] THE FOUR-ERA BLOCK AFTER THE DIAGNOSTIC, BY OPTION =====
  (minutes, from the reward screen to the first era-five lesson)
  A: play it all                   q=147 place=21 clocked-ceremonies=0 choices=0  => 63.0 min
  B: hand it over (= D-ERA18)      q=  0 place= 6 clocked-ceremonies=4 choices=0  => 10.0 min
  C: trial is the test-out         q= 42 place=21 clocked-ceremonies=0 choices=0  => 28.0 min
  D: one founding                  q= 42 place=21 clocked-ceremonies=0 choices=0  => 28.0 min
  E: reserved ceremony             q= 21 place=21 clocked-ceremonies=0 choices=0  => 21.0 min
  F: choose per era, no questions  q=  0 place=21 clocked-ceremonies=4 choices=4  => 22.0 min
  F + one item/node                q= 21 place=21 clocked-ceremonies=0 choices=4  => 23.0 min
  F + D + one item/node            q= 21 place=21 clocked-ceremonies=0 choices=4  => 23.0 min

=====[2] ADVISOR-LINE DENSITY: the repetition finding, per option =====
  A                                  ceremonies=4  advisor lines=16 from 4 distinct  block=66.0min  lines/min=0.24  min between ceremonies=16.5
  C                                  ceremonies=4  advisor lines=16 from 4 distinct  block=28.0min  lines/min=0.57  min between ceremonies=7.0
  D                                  ceremonies=1  advisor lines= 4 from 4 distinct  block=24.0min  lines/min=0.17  min between ceremonies=n/a
  E                                  ceremonies=0  advisor lines= 0 from 4 distinct  block=17.0min  lines/min=0.00  min between ceremonies=n/a
  F (question-less, 4 ceremonies)    ceremonies=4  advisor lines=16 from 4 distinct  block=22.0min  lines/min=0.73  min between ceremonies=5.5
  F + D (question-less, 1 ceremony)  ceremonies=1  advisor lines= 4 from 4 distinct  block=18.0min  lines/min=0.22  min between ceremonies=n/a
  F + one item/node, 4 ceremonies    ceremonies=4  advisor lines=16 from 4 distinct  block=23.0min  lines/min=0.70  min between ceremonies=5.8

=====[3] WHAT PACES F's BEATS: beatQuotas has nothing to distribute =====
  prehistoric  nodes=6  answers available under F=0  placements available=6  beats=4  placements/beat=1.50
  neolithic    nodes=5  answers available under F=0  placements available=5  beats=4  placements/beat=1.25
  bronze_age   nodes=5  answers available under F=0  placements available=5  beats=4  placements/beat=1.25
  classical    nodes=5  answers available under F=0  placements available=5  beats=4  placements/beat=1.25
  So the only non-clock currency F has is PLACEMENT, at 1.31 per beat averaged over the run, against D-ET8's rejected 6.00 answers/beat.

=====[4] THE SHIPPED AUTO-LAYOUT, measured on the shipped radius =====
  prehistoric       roster= 6  seated by defaultPlacements= 6  complete
  neolithic         roster=11  seated by defaultPlacements=11  complete
  bronze_age        roster=16  seated by defaultPlacements=16  complete
  classical         roster=21  seated by defaultPlacements=20  SHORT BY 1
  medieval          roster=26  seated by defaultPlacements=22  SHORT BY 4
  renaissance       roster=32  seated by defaultPlacements=23  SHORT BY 9
  industrial        roster=38  seated by defaultPlacements=24  SHORT BY 14
  atomic_age        roster=47  seated by defaultPlacements=24  SHORT BY 23
  information_age   roster=53  seated by defaultPlacements=24  SHORT BY 29
  cyberpunk         roster=62  seated by defaultPlacements=24  SHORT BY 38
```

**1. F saves 6 minutes of 28, not 14.** Removing 42 questions removes 14 minutes, and F then has
to buy the ceremony's clock back at 90 seconds an era. **The questions were never the cost; the
placements were**, at 14 minutes of a 28-minute block. So the answer to *"the user gets annoyed at
having to do it"* depends on which "it" he means. **If the annoyance is at being asked, F removes
all of it. If it is at the time, F removes a fifth.** That distinction is worth putting to him
before anything is built, and §9 assumes the first.

**2. F is the worst option on the measured repetition, which was your fourth question and it goes
against F.** 0.73 advisor lines a minute against C's 0.57, and 5.5 minutes between ceremonies
against C's 7.0. **F makes C's failure sharper**, and the mechanism is exactly what you suspected:
with no questions and no lessons between them the ceremonies are most of the content, so they
arrive closer together in a shorter block. My §4.4 finding was C's single worst number and **F
makes that number worse by 28%.**

**3. F cannot pace its own beats with agency, and this is the structural finding.** `beatQuotas`
distributes an era's checks across four beats (`apps/web/src/city/eraCeremony.ts:207-243`), and
under F there are no checks. The only other currency F has is placement, and measured, that is
**1.31 placements a beat** averaged over the run. D-ET8 fixed four beats over three because
*"three beats over a nine-node era's eighteen questions is six correct answers between visible
changes"* was too long (`:1210`). **F offers a fifth of the rate D-ET8 rejected as too slow.** So
F's beats have to be clock-driven, and a clock-driven four-beat sequence is Option B's montage with
a stop button between eras. **That is not a criticism of F's idea, it is a correction to F's
mechanism**: F's good part is the choice, and the choice cannot pace a ceremony.

**4. Auto-layout does not cost what the merged record said, and this corrects it.** The merged
record's §5.2 says B *"needs an **auto-layout** for 21 buildings, which is new code"*
(`2026-08-01-test-out-placement-experience.md:383`). **It is not new code.**
`defaultPlacements` is the shipped greedy auto-layout in `apps/web/src/city/worldLayout.ts`,
described as such by the guard that measures it (`apps/web/src/city/eraCityLand.test.ts:145`), and
it already reserves the hall's cells before running (`2026-07-25-town-hall-design.md:29`). Measured
above: it seats eras one to three's rosters **completely**, and falls **short by one** at era four
on the shipped radius, because *"what runs out is contiguous ground, not tiles"*
(`eraCityLand.test.ts:154-158`). **So the cost of F's third choice is wiring plus era four's
authored land**, and the land is a prerequisite of era four existing at all rather than a cost of
this decision. **Its production wiring today is the `?mock` demo only**
(`apps/web/src/city/mockCity.ts:111`, and `2026-07-25-town-hall-design.md:416` calls it
*"Demo-only (`?mock`)"*).

**Does F survive without the third choice?** **Yes, and it is better without it for a reason that
is not budget.** Two choices are *build it yourself* and *start here instead*, which are a real
question with two real answers. Three choices make one of them *let the machine decide*, and a
learner who picks that has been handed the option the merged record spent a page arguing against.
**But the honest counterweight, and it is D-TH9's:** every placed building is movable forever
(`2026-07-25-town-hall-design.md:759`), so an auto-layout **defers** the aesthetic choice rather
than spending it, and D-ERA18's own bullet says so in as many words: *"Everything stays movable
afterwards (D-TH9), so nothing auto-placed is permanent"*
(`2026-07-27-era-progression-design.md:2007-2008`). **So the third choice is cheap and it is not
the loss the merged record priced. Keep it, and keep it third.**

#### The rulings F changes, which was your fourth question

**Fewer than C or D, and one of them not at all, which is §8.5's finding.**

| Ruling | Where | What F does to it |
| --- | --- | --- |
| **D-ET2** | `2026-07-29-era-trial-contract.md:1204` | **Repealed for the prologue, and this is F's real ruling cost.** D-ET2 is *"the ceremony IS the town hall rebuilding itself, **advanced through construction stages by correct answers**"*. F removes the mechanism, not the image. A clock-advanced four-beat sequence is a different object and the document has to say so |
| **D-ET8** | `:1210` | **Not amended in letter and voided in substance.** The four beats and their order survive; what dies is the pacing arithmetic the ruling is argued from, since there are no answers to count. This is the ruling F is least honest with, because it looks untouched |
| **D-ET3** | `:1205` | **Same as D and E.** The tested-out learner's ritual is a different object from everybody else's |
| **D-ERA16 / the trial's mastery gate** | `engines/game/src/era-trial.ts:200-215` | **Nothing, because D-ERA17 already excepted the prologue.** §8.5 |
| **INV-COS-1** | `2026-07-29-era-resource-model-design.md:839` | **Untouched, and it constrains the reject.** Rejecting the pre-seed must cost nothing: no material penalty, no withheld ceremony, no worse ending. It is more work, chosen. That is the only reading INV-COS-1 permits |
| **`seedFromPlacement`'s shape** | `apps/web/src/city/citySession.ts:967-1013` | **Not a ruling, and the largest unpriced piece of work in F.** It is a single whole-city write over `CITY_NODE_IDS` that clears placements and roads and marks every unlocked node complete at once, so a per-era reject has nothing to reject: the state is already written. F needs the seed deferred per era, which D-ERA18's *"each later era auto-fills during its montage"* implies and the shipped function does not do |

#### Is the learner an adequate detector? No, and here is the minimum addition

**The honest answer is no, and the citation is the one you gave me.** The persona *"has a vague
sense she has 'gaps' but cannot name them"* (`docs/Game_Visual_Design_Brief.md:54-55`). **F asks
her to name them, at era granularity, before she has seen any of the content.**

**The two counterweights are real and neither closes the gap.** Placement is fail-closed, and
#386 measured era-level precision at **97.3% to 100%** with sensitivity collapsing instead
(`2026-08-01-diagnostic-placement-accuracy.md:210-219`, measured on branch `05e07c11`), so the offer the learner
is accepting is almost always correct and the base rate does most of the work. And an explicit
reject genuinely is a better hatch than an implicit one, because it hands the learner the words.

**But the two counterweights fail on the same cases, and that is the finding.** The residual is
the fail-open case: the learner does **not** know the material and the instrument said they did.
That is precisely the case where self-assessment is least reliable, because not knowing something
and not knowing that you do not know it are the same state. **So F's hatch is aimed at the one
population least able to use it**, and its safety is `2.0% × P(accept | over-placed)`, which is
bounded above by Option B's 1 in 50 and bounded below by zero, **with nothing in this repository
able to locate it inside that interval.** #386 says why no simulation can: O-ACC3, validating
placement against a human, is *"the caveat that no further simulation can remove"* (`:566`).

**F is therefore weakly better than B and unquantifiably so.** That is a genuine improvement and
it is not a safety argument.

**The minimum addition that makes it adequate is Option G, and it is one minute.** One item per
node moves the detector from the learner back to the instrument for **95%** of the residual cases,
takes the silent-advance rate to **1 in 1,000**, and gives the ceremony back the answers its beats
need. Measured: F is 22 minutes and F plus G is **23**. **The two proposals compose, neither is
sufficient alone, and the composition is cheaper than C.**

#### Target feelings, and the failure mode

Against §3, F is the **best** option for two of the four learner types and the worst for one.

| Learner | F's verdict |
| --- | --- |
| **Tests out of nothing** (§3.1) | **Unaffected**, like every option |
| **One era** (§3.2) | **Best of the six.** One choice, one placement round, one ceremony, then era two's real content. The choice costs thirty seconds and buys the whole *"it gave me credit"* half |
| **Four eras** (§3.3) | **Split, and it is the only option that is.** *"The city already knows who I am"* is served better than by anything else, because the learner was **asked**. *"The part I actually came for starts today"* is served worst of the middle options, because four identical ninety-second ceremonies with nothing between them is the failure §4.4 named, measured 28% sharper |
| **Nine eras** (§3.4) | **Worst of the six.** Nine choices from the same three cards and nine identical clocked ceremonies, and the auto-layout seats 24 of the 53 buildings on any authored ground that exists |

**The failure mode in one sentence a person would recognise.** *"It kept asking me the same
question and then playing the same cutscene."*

### 8.5 The baseline correction: the ruled state is already Option B, and neither record noticed

**This is the largest single finding in the third revision and it inverts the merged record's
ruling-cost column.**

**D-ERA18 (DECIDED)**, at `2026-07-27-era-progression-design.md:1994` with its ruling row at
`:2644`:

> **Every student places era one by hand; later eras auto-fill during the montage.** Forced by
> `seedFromPlacement` clearing placements. The diagnostic reads at the **domain** level and never
> pre-seeds individual buildings. Everything stays movable

And **D-ERA17's rule stated plainly**, at `:2039-2041`:

> The diagnostic discharges lessons. It never discharges mastery or a trial, **except for the eras
> the prologue places you past, while its evidence is still fresh.**

**Neither the merged record nor #386's record cites either ruling.** Checked mechanically:
`rg -c "D-ERA18"` returns no match in both. **Four consequences, in order of what they cost.**

1. **A tested-out era needs no trial today, by ruling.** Both records treat that as a change
   requiring D-ERA16 amended, and the merged record's §8 puts it in every option's ruling column.
   **It is already ruled.** What C and D need is not an amendment to D-ERA16 but a **reversal of
   D-ERA17's prologue exception**, because they add a trial the ruling discharged. **So the
   ruling-cost ordering in the merged record's §5.6 is upside down**: B and F are near the ruled
   state and C and D are the departures.
2. **The lead's original brief was describing a ratified decision, not an intuition.** His *"the
   remaining eras are a time lapse of the city being built up to the era that they didn't test out
   of"* **is D-ERA18**. The merged record answered *"there is no time-lapse in the tree"* (its
   §2.5), which is true of the code and misses that the design ruled for one.
3. **F is a modification of D-ERA18, not a sixth option relative to it.** F adds the per-era stop
   and the three-way choice; the montage, the auto-fill and the movability are D-ERA18's. **And
   F's stated rationale is already in the ruling**: *"you learn what advancing feels like before
   you have to earn one"* (`:1901-1902`) is the lead's *"they still get the progression feel"*,
   written down on 2026-07-27.
4. **The ruled state also contradicts the shipped code in two places, and F inherits both.**
   D-ERA18 says the diagnostic *"reads at the domain level"* and *"does not pre-seed individual
   buildings"*, where `seedFromPlacement` pre-seeds **per node**
   (`apps/web/src/city/citySession.ts:998-1013`). And D-ERA18 gives the learner **six**
   placements where the five options give 21. **So the ruled state is not what any of the five
   options describe, and the ruled state is what F is closest to.**

**One open question F answers for free, and it is owed to Evan.** The skill-building rulings record
asks what era's clothes a prologue era's buildings arrive in, calls it *"load-bearing"* and *"the
single question that decides whether D-ERA22 needs a stored field"*
(`docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md:412-418`). **Under F the learner
is standing in era two when era two's buildings go up, so they arrive in era two's clothes by
construction and no field is stored.** Under B's single montage the question is open. That is a
real merit of walking the eras in order and nobody had connected it.

### 8.6 Does agency vary across the live options? No, and the lead does not have to make the trade

**His tension, verbatim:** *"we dont want them to just skip over everything without any agency in
how their city is structured. but we also dont want them to redo too much content; i am just not
sure how to trade them off."*

**Tested rather than adopted, and the reviewer's reading is right about the five options.**
Placement is **21 in A, C, D and E and 0 in B** (`2026-08-01-test-out-placement-experience.md:630`),
B is ruled out on safety at 1 in 50 and on cost, and **placement is free**: `placeSkill` is an
*"in-app layout write only (never a game write)"* with no material term
(`apps/web/src/city/citySession.ts:682-686`). **So among the live options, agency over placement is
constant, and my §3.3's framing that *"respects me"* and *"the city is still mine"* trade against
each other is wrong on this axis.** It was right that the two feelings pull in different
directions and wrong that any option makes the learner choose between them.

**Is placement the whole of agency over the city's structure? No, and the rest is the more useful
answer.** Six things a learner decides about their city, and what varies:

| Structural decision | Varies across A, C, D, E, F? | What actually gates it |
| --- | --- | --- |
| **Where each building goes** (21) | **No.** 21 in all of them | Nothing. Free |
| **Where each building goes LATER** | **No.** D-TH9: every placed building is movable, *"purely spatial (no mastery/stage/star change)"* (`2026-07-25-town-hall-design.md:759`) | Nothing. And it is what makes even B's auto-layout a deferral rather than a spend |
| **Build order** | **No.** Available wherever placement is | Nothing |
| **Roads** | **No.** Unavailable in all of them | **Material.** 5 a tile (`apps/web/src/city/roads.ts:34`) against a learner holding **zero** (§7.2) |
| **Civic buildings and decorations** | **No.** Unavailable in all of them | **Material**, same gate. And a bought cosmetic is **visually inert** anyway (`2026-08-01-game-feel-mechanics-backlog.md:1046-1051`) |
| **What the crisis takes and what comes back** | **No.** Unavailable in all of them | **Mastery.** The pool filters `mastery >= CRISIS_MASTERY_GATE` (`engines/game/src/mid-era-crisis.ts:132,61`), so it is empty at mastery 0 |

**So the answer to give him plainly: he does not have to make the trade, because the two things he
named do not trade.** He can have **all 21 placements at any confirmation volume**, from 0 to 147,
and nothing in the era model or the rulings couples them. **What is actually on the table is two
much narrower choices**: how much confirming is enough (§8.3 prices 0, 21 and 42), and how the
ceremonies are packaged (§8.0 prices 0, 1 and k).

**And the agency he is right to worry about is real, it is three of the six rows above, and no
option touches any of them.** Roads, purchases and crisis response are all withheld from this
learner by two decisions he has not been asked about: the mastery clause (**O-TO2**) and the
economy's test-out seam (**O-TX3**). **That is where his instinct is pointing and it is not on the
option axis at all.**

**Does count-versus-texture rescue the tension? Not in the direction it was offered, and the
version that survives is not a trade either.** Twenty-one placements in one sitting is genuinely a
different experience from 21 over four evenings, and that is worth taking seriously. But worked
through the walkthroughs it does not favour C over D:

- **Within the sitting, D is finer-grained than C, not coarser.** C delivers placement in **four
  discrete blocks each followed by a quiz** (§5.3), where D distributes placements through one act
  so that answers unlock buildings (§5.4). **D-b (§8.1) is finest of all**, alternating one
  placement with its two items. So *"21 decisions in a row is not the same as 21 spread out"* is
  an argument **for** the run-spanning packaging, because that is the packaging that spreads them.
- **Across calendar time, nothing can buy it.** §8.0's three constraints force the run contiguous,
  so 21 placements over four evenings is unreachable at any question count and under any option.
  **That is a constraint rather than a trade-off, and it is the one real thing the texture worry
  identifies.**

**So the texture point sharpens the recommendation rather than rescuing the tension.** The best
available texture is the finest interleaving inside one sitting, which is D or D-b, and the reason
the tension felt unresolvable is that one of its two horns was never a variable.

---

## 9. Recommendation: a combination, not a letter

> **SUPERSEDED IN ONE TERM 2026-08-01 BY THE RULING IN §10, AND KEPT UNEDITED.** The lead took
> **zero** confirmation questions where this section argues for 21, and directed the saved effort at
> the reject affordance instead. **Everything else here was adopted**: F's per-era choice and D's
> single founding both ship. §10.1 records why zero costs fewer rulings than 21 rather than more,
> which is the part of this section's cost argument that was wrong. **The rest is kept in place
> rather than rewritten**, because a reader deciding whether the ruling was right needs the argument
> it beat, and §10.2 depends on this section's residual figures being visible.

**Take F's per-era choice, D's single founding, and G's one item per node. Call it F+D+G.** It is
**23 minutes, 21 questions, one ceremony, 21 placements, a silent-advance rate of 1 in 1,000, and
an explicit way out at every era.** Against C's 28 minutes and 42 questions, and against the ruled
state's 10 minutes and no confirmation at all.

**Say the shape of the recommendation before the reasons, because the shape is the point.** Each
of the three pieces repairs a defect measured in one of the others, and none of them is sufficient
alone.

| Piece | What it contributes | Whose defect it repairs |
| --- | --- | --- |
| **F's three-way per-era choice** | The only agency over the pre-seed anybody has proposed, and an explicit reject | **C's and D's.** Both apply a policy; neither asks. This is the piece that answers the lead's own tension |
| **D's single run-spanning founding** | One ceremony instead of four | **F's worst measured number.** F is 0.73 advisor lines a minute against C's 0.57; F+D is 0.22 |
| **G's one item per node** | 21 questions, and answers for the beats to run on | **F's detector gap and D's pacing.** F leaves the learner as the only detector; D is 10.50 answers a beat against a rejected 6.00, and G at four eras is 5.25 |

**Why each piece, in one sentence.**

1. **F's choice, because it is the best single idea anybody has put on this table and it is the
   only one that is about the learner rather than about the product's schedule.** Every other
   option, mine included, is a policy applied to somebody. F asks. And the thirty seconds it costs
   at each era is the only moment in any of the six walkthroughs where the product's first move is
   a question rather than an instruction (§8.4).
2. **D's packaging, because F's is measurably the worst on the table and C's is second worst.**
   This is the one place the costing went against the lead's design, and it went against it on his
   own instinct: he asked whether four ceremonies with nothing between them might be worse than
   C's, and measured, they are, by 28% on line density and by 1.5 minutes on spacing (§8.4).
3. **G's count, because with zero confirmation the learner is the detector and the brief says she
   *"cannot name"* her gaps**, and because the residual F leaves is exactly the population least
   able to use F's hatch (§8.4). One minute of added time buys 95% detection and takes the silent
   advance from somewhere in `[0, 1 in 50]` to a measured 1 in 1,000.

**What it gives up, stated so it can be declined on these grounds.**

1. **It is the most ruling-expensive thing in this record, and by some distance.** D-ET2 repealed
   for the prologue, D-ET8 voided in substance, D-ET3, D-ET7 and D-ET10 reversed, OT-12 closed,
   OT-14 answered, plus the mastery clause in Anthony's lane. **Against Option B, which needs
   none, because §8.5 establishes B is the ruled state.** If the lead's priority is to ship
   something, the honest answer is that the ruled state already ships and F+D+G is a five-ruling
   argument for improving it.
2. **1 in 1,000 is 20x worse than C or D, and nobody has set a bar.** #386 said that about B and it
   is true here: *"whatever bar makes a 1-in-50 silent advance acceptable, and nobody has set
   one"* (`2026-08-01-diagnostic-placement-accuracy.md:391`, measured on branch `05e07c11`). I am recommending a
   figure against an absent bar, and the reject hatch is what I am counting on to cover it, which
   is an argument rather than a measurement.
3. **`seedFromPlacement` has to be deferred per era**, and that is a single whole-city write today
   (§8.4's table). It is the largest unpriced engineering item in the recommendation.
4. **It does not shorten the twenty minutes that cost this learner most.** Identical under all six
   options (§6.1). **O-TX5's D-END9 precedent is still the cheapest thing in this record and it is
   still not on this axis.**
5. **It still fails the nine-era learner**, at 53 nodes, 13.25 answers a beat and an auto-layout
   that seats 24 (§8.4). **O-TX4 stands unchanged.**

**Where this disagrees with what came before, precisely.**

- **Against the merged record's C:** on packaging, on volume, and on the ruling-cost ordering,
  which §8.5 inverts.
- **Against my own first draft's D:** D was right about packaging and wrong to stop there. The
  reviewer's objection stands: **C and D ask the same 42 questions, so D never answered the
  lead's complaint at all.** It answered a different complaint that I had measured and he had not
  raised.
- **Against the lead's F, in one place only:** its packaging. **F's choice survives intact and is
  the centre of the recommendation.**
- **Against nothing in #386.** Its safety ordering holds and G is priced inside it.

**What would change my mind, as falsifiers rather than hedges.**

1. **If the annoyance is time rather than being asked, G is not enough and F's zero is right.**
   Measured, F saves 6 minutes of 28 and F+D+G saves 5 (§8.4). If the lead's *"annoyed at having
   to do it"* means the clock, **none of the six options is a good answer and the thing to attack
   is the 14 minutes of placement**, which nobody has proposed touching.
2. **If a learner reports that the era boundary is what makes the run legible**, four markers beat
   one, C's packaging wins, and G at era granularity is unavailable because it lands in OT-12
   (§8.3). **That combination would be C+F, not D+F.**
3. **If P(accept | over-placed) turns out to be low**, F's hatch is a real detector, G is
   unnecessary, and the recommendation collapses to F+D. **Nothing in this repository can settle
   that** and #386 says why (O-ACC3).

**One thing none of this does.** It does not widen the diagnostic, which is Gabe's and was declined
2026-07-26, and it does not move the v1 checker, which is first in the queue and gates every word
above (`2026-08-01-diagnostic-placement-accuracy.md` §9, §10, measured on branch `05e07c11`). **Nothing here is
reachable until that moves.**

### 9.1 All six, and the three combinations, side by side

Minutes and line densities are §8.4's harness output; safety is #386's fail-open figure composed
with §8.3's re-derivation; rulings count what each forces on its own, **corrected for §8.5**.

| | Min | Questions | Placements | Ceremonies | Lines/min | Silent advance | Rulings vs the RULED state |
| --- | --: | --: | --: | --: | --: | --- | --- |
| **A** play it all | 63 | 147 | 21 | 4 | 0.24 | none at era level | reverses D-ERA17's exception |
| **B** = the ruled state | 10 | 0 | **6** | 4 | 0.24 | **1 in 50** | **none** |
| **C** trial is the test-out | 28 | 42 | 21 | 4 | 0.57 | 1 in 20,000 | reverses D-ERA17's exception, D-ET1 |
| **D** one founding | 28 | 42 | 21 | 1 | 0.17 | 1 in 20,000 | C's, plus D-ET8, D-ET3 |
| **E** reserved ceremony | 21 | 21 | 21 | 0 | 0.00 | worse than G, no re-queue | D-ET3, D-ET10, a new surface |
| **F** choose per era | 22 | **0** | 21 | 4 | **0.73** | `[0, 1 in 50]`, unquantifiable | D-ET2, D-ET8 in substance, D-ET3 |
| **G** one item per node | n/a | 21 | n/a | n/a | n/a | 1 in 1,000 | D-ET7, D-ET10, OT-12 |
| **F+D** | 18 | 0 | 21 | 1 | 0.22 | `[0, 1 in 50]` | F's plus D-ET3 |
| **F+G** | 23 | 21 | 21 | 4 | 0.70 | 1 in 1,000 | F's plus G's |
| **F+D+G** *(recommended)* | **23** | **21** | **21** | **1** | **0.22** | **1 in 1,000** | the most of any row |

**Read the last column with §8.5 open, because it is the column that changed most.** Every other
record counts rulings against a baseline in which nothing was ruled. Counted against the state
D-ERA17 and D-ERA18 actually ruled, **B is free and every improvement on it is expensive**, which
is the honest shape of this decision and the opposite of how both earlier records presented it.

---

## 10. RULED 2026-08-01: F + D + zero confirmation, and the reject is now the whole design

> **A THIRD RULING ON THIS SURFACE LANDED AFTER §10.19 MERGED, AND IT IS §10.20 TO §10.25.** The lead
> ruled the skills into **two tiers**: *"it should include the one sentence, then allow an option to see
> more on the skills for that era too if they want to."* **§10.20 records it and corrects §10.15's own
> description of the option**, §10.21 rules on tier two's composition, §10.22 re-takes the 1024x580
> budget, §10.23 records the three things it owes, §10.24 shows the walk does not move, and §10.25 has
> the strings. **This is what resolves O-TX18.**
>
> **A THIRD REVISION LANDED THE SAME DAY AND IT IS §10.14 TO §10.19.** The lead changed the shape
> twice more: **the walk is per era with the four beats at each one, and the stop-or-continue prompt
> shows the age's skill names instead of a sample problem.** §10.11's dial-as-probe and §10.12's
> strings are superseded, each with a note in place, and **§10.11's findings are superseded in
> APPLICATION rather than in fact.** The prefix property, the 20 states, the build-mode answer, zero
> confirmation and the re-offerable clause are all unchanged.
>
> **A SECOND RULING LANDED THE SAME DAY, after this record merged, and it is §10.9 to §10.13.** The
> lead ruled **O-TX14**: the choice is a **stopping point**, not a per-era toggle, and stopping at an
> age forfeits the skip for everything after it. **That supersedes §10.4's open question, §10.5's
> build-mode default and §10.7's option strings**, each of which carries a note in place. **§10.1 to
> §10.3 and §10.6 are untouched**, along with the accepted residual, the
> recognition-over-self-assessment finding and the re-offerable clause.

**The lead ruled, and he took neither of the two options put to him.** Offered one item per skill
against zero, verbatim:

> *"zero, but make the reject harder to miss."*

**What ships.** The per-era three-way choice, the four beats **once** as a single founding covering
every skipped era, and **no confirmation question at all**. So the recommendation in §9 is
superseded in one term: **F + D + zero**, where §9 argued F + D + G.

**Everything §9 costed about F and D stands unchanged.** D-ET2 repealed for the prologue, D-ET8
voided in substance, D-ET3, and `seedFromPlacement` still the largest unpriced item because a
per-era reject has nothing to reject while the seed is one whole-city write
(`apps/web/src/city/citySession.ts:967-1013`).

### 10.1 O-TX8 is what changed the decision, and it must be recorded as such

**Zero questions is not a departure from the ruled state. It is the ruled state.** §8.5 established
this and it is the reason the third road existed at all:

> **D-ERA17's rule, stated plainly** (`2026-07-27-era-progression-design.md:2039-2041`): *"The
> diagnostic discharges lessons. It never discharges mastery or a trial, **except for the eras the
> prologue places you past, while its evidence is still fresh**."*

**So no amendment is owed on that axis, and a later reader must not re-derive the opposite.** The
merged record's §8 puts *"D-ERA16 / D-ERA5's gate"* in the ruling column of options C, D and E, and
the ordering that follows from it is upside down. **Stated once, plainly, because this is the thing
most likely to be re-derived wrongly:**

| | What the merged record says it costs | What it actually costs against the ruled state |
| --- | --- | --- |
| **Zero questions** (B, F, the ruling) | D-ERA5 repealed, 3+ rulings, *"the lead's own objection"* | **Nothing on this axis.** D-ERA17's exception already discharges the trial for prologue-placed eras |
| **42 questions** (C, D) | *"2, or 3 with the mastery clause"* | **A reversal of D-ERA17's prologue exception**, because it adds a trial the ruling discharged |
| **21 questions** (G) | not costed there | The same reversal, plus D-ET7 and D-ET10 |

**And there is a second instance of the same miss, which is why it is worth a table.** A shipped
module quotes D-ERA17's rule with the exception clause dropped:
`packages/skill-graph/src/eraTimeline.ts:225` reads *"the diagnostic discharges lessons, never
mastery and never a trial"*, with no *"except"*. **That docblock is correct about its own case**,
which is a banked era ahead of the marker, and the un-excepted form is right there. What it shows
is that the exception is genuinely easy to lose, since it went missing in a module written by
someone reading the same ruling. **Carried as part of O-TX8 rather than as a defect**, because
nothing behaves wrongly: a summary is incomplete.

### 10.2 The accepted residual, recorded as accepted rather than solved

**RULED 2026-08-01 by the team lead. The residual silent-advance risk is ACCEPTED, at the figure
measured in §8.4, in exchange for investment in the reject affordance.**

| | Figure | Where it comes from |
| --- | --: | --- |
| Era-one fail-open rate, full scope | **2.0%** | `2026-08-01-diagnostic-placement-accuracy.md:210`. **#386 MERGED 21:32:36Z**, so this is on `integration` |
| Residual under the ruling | **`2.0% × P(accept | over-placed)`** | §8.4. Bounded above by **1 in 50** and below by 0 |
| Residual it was compared against | **1 in 1,000** (one item per node) and **1 in 20,000** (two) | §8.3, re-derived |
| What located it inside the interval | **Nothing** | #386's **O-ACC3**: validating placement against a human is *"the caveat that no further simulation can remove"* (`:566`) |

**So the number the design now aims at has a name, and naming it is the point of this subsection:
`P(accept | over-placed)`.** Every decision in §10.3 to §10.7 is an attempt to push that one
conditional down, and none of them can be measured by simulation. **The reject affordance is not a
safety net around the ruling. It is the ruling's only safety argument**, and it should be reviewed
as such rather than as copy.

**Two things follow that are worth stating before the design.**

- **The bar it is being accepted against still does not exist.** #386 raised that about Option B in
  its own words, *"whatever bar makes a 1-in-50 silent advance acceptable, and nobody has set
  one"* (`:391`, measured on branch `05e07c11`). **O-TX10 stays open under the ruling rather than being closed by
  it.**
- **The direction of the ruled instrument is the one thing on this side of the ledger.** INV-DIAG-7
  says the instrument *"remains biased toward false-negatives (redo easy content) over
  false-positives (uncovered gaps)"*
  (`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md:76`), and #386 measured era-level precision
  at **97.3% to 100%** with sensitivity collapsing instead. **So the offer the affordance presents
  is almost always correct, and the affordance exists for the case where it is not.**

### 10.3 What the affordance shows: recognition beats self-assessment, and the steer needs one correction

**The problem restated, because it is the reason a louder button does not fix anything.** §8.4
established that the learner who most needs the hatch is least able to use it: the persona *"has a
vague sense she has 'gaps' but cannot name them"* (`docs/Game_Visual_Design_Brief.md:54-55`), and
the residual is exactly the case where the learner does not know the material, which is the case
where self-assessment is least reliable.

**The steer is right and it needs one correction, and the correction comes from this repository's
own evidence base.** Replacing *"do you know this?"* with *"can you do this?"* over concrete
material is correct. **But it matters enormously what the concrete material is, and a worked
example is the wrong choice**, because the BrainLift's Category 4 documents the exact failure a
worked example would cause:

- **Roediger and Karpicke 2006**, as summarised in the BrainLift: *"Repeated studying produced
  higher confidence and better short-term performance, so it looked more effective at the time even
  though it retained less later"* (`docs/BrainLift_Game_Design.md:281`).
- **Karpicke and Blunt 2011**: *"Learners predicted retrieval practice would be the least effective
  method, so the technique that worked best was the one students felt least confident using"*
  (`:273`).
- And the analysis the team drew from them: *"Because the more effective method feels worse and
  tests worse immediately, an engagement-optimizing design will systematically pick the wrong
  one"* (`:283`).

**Read together, those say that exposure inflates confidence.** So showing a learner a worked
solution and then asking whether they could have produced it **manufactures the feeling of
competence that makes them accept**, and it does so hardest for the learner who cannot do it. **A
worked example is not neutral evidence at the moment of choice. It is a thumb on the scale, pressing
in the fail-open direction.**

**An unworked problem is the opposite.** It hands over no fluency, and asking *"could you do this
one?"* over it is a retrieval cue rather than a restudy event. **So: show the problem, never the
solution.** That is the correction, and it is the only place the steer needed one.

**What goes on screen, and every piece of it already exists.**

| Element | Source | Authoring cost |
| --- | --- | --- |
| The era's name | `EraDefinition.name`, for example *"Neolithic Era"* (`packages/skill-graph/src/eras.ts:273`) | **None** |
| One line on what it teaches | `ERA_SUMMARIES[era].concept`, for example *"growth by a factor, and the way back"* (`packages/skill-graph/src/eraTimeline.ts:93`) | **None.** Ten already authored, `:84-162` |
| The fuller description, on the expanded card only | `ERA_SUMMARIES[era].summary` (`:94-98`) | **None** |
| **One unworked problem from the era**, prompt only | The era's own frozen practice pool, 35 to 47 distinct items a node (§8.3) | **None** |
| The skills by name, if the card is expanded | The lesson title, which is what the shipped ceremony already uses for a learner-facing skill name (`apps/web/src/city/EraAdvanceCeremony.tsx:241-243`) | **None** |

**Three things about that table are worth more than the table.**

1. **The era copy is already guarded against the exact objection this copy will be reviewed
   against.** `ERA_SUMMARIES`'s own docblock says every label is *"written from what the era
   TEACHES"* rather than from the bookkeeping axis (`eraTimeline.ts:34-36`), and
   `eraTimeline.test.ts:67-71` sweeps all **20** strings against **62 or more** product node ids and
   **10 or more** domain ids and fails on either, with a counter-example at `:87-97` proving the
   sweep measures something. **So reusing it means the no-node-ids rule is enforced by a test rather
   than by review.**
2. **The sample problem needs no checker, and that is the single most useful engineering fact in
   this section.** The learner **looks** at it and picks a road; nothing is graded. So the reject
   affordance is **the one part of this design that is not blocked on the v1 checker migration**,
   which #386 re-measured as 22 of 66 D1+D2 walk items ungradable. **It can therefore be built and
   usability-tested at era one today, on the shipped six-node diagnostic**, which is the only route
   anybody has to a number for `P(accept | over-placed)` before the widening. Carried as
   **O-TX13**, and it is the cheapest thing in this record after O-TX5.
3. **Two of the ten eras have no items to draw from.** §2.4's measurement: eight of ten eras have
   practice items and eras seven and ten have none. So the sample-problem row degrades for those
   two and the card falls back to concept plus summary. **That is a content dependency rather than a
   design flaw**, and it is the same dependency era seven has for existing at all.

**Verdict on the steer: recognition beats self-assessment here, and the reason is not that learners
are good at recognition.** It is narrower and it is the only claim the evidence supports. A
self-assessment question asks the learner to search their memory for an absence, and an absence is
the one thing memory cannot report. **A problem on screen replaces that search with a comparison**,
and a comparison against a concrete object is a judgement they can actually make. **What it does not
do is make them accurate**, and nothing on this screen can. `P(accept | over-placed)` goes down
because the question got easier, not because the learner got better.

### 10.4 The single founding forces a structure, and it is better than n toggles

> **RESOLVED 2026-08-01 by the team lead, in this section's own direction and with a better answer
> than either it offered. See §10.9.** This section argued the reject collapses to a boundary and
> carried it as a trade (O-TX14) rather than deciding it. **The ruling takes the boundary**, and
> §10.9 measures what this section only argued: at nine ages a per-era reject toggle offers 512
> states of which 10 are buildable. **Kept unedited**, because the argument is what the ruling
> confirmed.

**This falls out of the ruling rather than contradicting it, and it should be confirmed rather than
assumed, because it changes what the affordance is.**

**The reject cannot be n independent toggles once the founding is single.** Suppose a four-era
learner accepts eras one and two and rejects era three. They then play era three in full: lessons,
practice, its trial, its ceremony. **Era four's skip now has nowhere to live.** It cannot be inside
the founding, because the founding ended when era three's ordinary play began, and D-ET2 makes the
ceremony **be** the hall rebuilding into the next era's landmark
(`2026-07-29-era-trial-contract.md:1204`), so a second one is a second founding. The ruling says the
beats play **once**.

**So one founding implies one contiguous accepted prefix, and the reject is a BOUNDARY rather than a
toggle.** The three choices survive in substance and reorganise into two questions:

| Question | Grain | What it is |
| --- | --- | --- |
| **Where do I take over?** | **Once over the run** | The reject, as a dial. Moving it earlier is *"reject the pre-seed"* for every era from there on |
| **For the ages before it, do I place or does the city?** | **Per era, or once for all** | *"place them yourself"* against *"have the game do it for them"* |

**Three reasons this is better than four cards with three buttons each, and the first is measured.**

1. **It removes the repetition finding that was F's worst number.** §8.4 measured F at **0.73
   advisor lines a minute against C's 0.57** and 5.5 minutes between ceremonies. That was driven by
   four ceremonies; the single founding already fixes it. **What four three-way cards would
   reintroduce is the same defect in the choice rather than in the ceremony**: the same three
   buttons, in the same three positions, four times. One dial is one decision.
2. **It is the only shape that works at nine eras**, which is where §3.4 and §8.4 both found F
   worst. Nine cards with three buttons is nine decisions; nine rows with one dial is one.
3. **It matches what the learner is actually being asked.** They are not choosing four times whether
   they know four things. They are choosing where their game starts. **The dial is the honest form of
   the question and the toggles were a UI shape standing in for it.**

**What it costs, and it is not nothing.** It gives up the case of a learner who knows eras one, two
and four but not three, and wants only era three taught. **That learner exists**: #386's sensitivity
figures mean a learner's passed set is not always a clean prefix, and D-ERA17 exists precisely
because *"a student's knowledge may not be a prefix of the sequence"*
(`2026-07-27-era-progression-design.md:2023-2024`). Under the dial they get era three **and** era
four taught. **The alternative is n foundings, which costs D's whole argument**, so this is a real
trade and it is the lead's to make. **Recorded as O-TX14 rather than decided here.**

### 10.5 The default: none per era, one per run, and every state visible

**The framing in the brief is right that neither pure answer works, and the way out is that
"default" is the wrong word for what is happening.**

- **If doing nothing accepts the skip, most learners skip.** Defaults dominate, and this one would
  push `P(accept | over-placed)` toward 1, which is the one number the whole design exists to lower.
  It also inverts the bias of the instrument whose output it is acting on: INV-DIAG-7 keeps the
  instrument *"biased toward false-negatives (redo easy content) over false-positives (uncovered
  gaps)"* (`Contracts_Amendment_Adaptive_Diagnostic_v2.md:76`). **A skip-by-default reads that bias
  backwards at the last step.**
- **If doing nothing plays the era, the inattentive strong learner gets Option A**, which is 105
  practice items and 63 minutes (§8.4), and they are the learner the whole feature exists for.
- **So neither, and here is the third thing.** The choice is **the founding's own opening surface**,
  not a modal over something else. There is nothing behind it to dismiss to, so there is no doing
  nothing. **Three roads, all of which go forward, is a fork rather than a wall**, and the tone bans
  are on pressure rather than on being asked: nothing here flashes, nags, shames or induces urgency
  (`docs/Game_Visual_Design_Brief.md:59`), and there is no timer, so the pass-or-fail-timer ban at
  `:69-70` is not approached either.

**What replaces a default is a visible proposal, and the distinction is the whole recommendation
here.** An invisible default dominates behaviour because nobody reads it. **A visible one is a
sentence the learner is looking at.** So:

- **Every era card opens in the state the diagnostic proposes**, which is *accepted, placed by you*,
  and **that state is written on the card** rather than implied by which button is highlighted.
- **One primary action confirms the lot.** The learner who wants to skip everything acts **once**.
- **The dial and the per-era placement style are two taps away and never required.**
- **Nothing is preselected on the reject dial.** It starts at *"after the last age the diagnostic
  covered"*, which is the diagnostic's own answer, and moving it is an action.

> **THE PARAGRAPH BELOW IS CORRECTED BY §10.10 AND KEPT IN PLACE.** It defaults the placement style
> to the learner on agency grounds. **D-ERA18 rules the opposite for ages two onward** and gives a
> reason, and it hand-places age one regardless, so the agency lands there instead. §10.10 has the
> argument and §10.13 has what the correction is worth: the four-era block goes from 16.3 minutes to
> **6.3**.

**Why the placement style defaults to "you place them" rather than to "the city places them".** It
is the agency the lead named first, at *"we dont want them to just skip over everything without any
agency in how their city is structured"*, and the cheaper option is one tap away. **And the cost of
guessing wrong here is the lowest of any decision on the screen**, because **D-TH9** makes every
placed building movable afterwards, *"purely spatial (no mastery/stage/star change)"*
(`2026-07-25-town-hall-design.md:759`), which D-ERA18 states to exactly this case: *"Everything
stays movable afterwards (D-TH9), so nothing auto-placed is permanent"*
(`2026-07-27-era-progression-design.md:2007-2008`).

### 10.6 Re-offerable: yes for the teaching, no for the ceremony, and it costs nothing

**The two halves come apart, and separating them is what lets the copy avoid a confirmation
step.**

**The teaching is already re-offerable, ruled, and free.** Three things hold at once and none of
them needs building:

- **INV-COS-1**: a shortfall *"gates nothing — not a lesson, not mastery, not the trial, not the era
  advance"* (`packages/economy/src/capacity.ts:46-48`).
- **Test-out never removed the lesson**, it stopped requiring it, which the merged record's §5.3
  states and the shipped coachmark says to the learner in its own words.
- **D-ERA19's layer 3 was promoted from available to a REQUIREMENT** by the team lead on 2026-07-29:
  clicking a placed building must open the lesson it came from, and *"the affordance is SHIPPED"*
  (`2026-07-27-era-progression-design.md:2548`).

**So a learner who accepts an age and then struggles opens the building and gets the lesson.** That
is not a new route; it is the route, and the only gap is that nothing tells them so at the moment
they decide.

**The era's ceremony is not re-offerable, and it cannot be made so.** §8.0's constraint decides it:
exactly one building tracks the present and it is the chapter marker
(`2026-07-27-era-progression-design.md:1655`), so once the founding runs the hall is the later era's
and era two's rebuild has nothing left to rebuild from. **The copy must therefore promise the
lessons and must not promise the age back.**

**And this is what removes the nag.** *"Are you sure?"* is a second prompt and a second prompt is
worse than a first; it also reads as the product doubting the learner, which is the register §6.4
found grating. **The reason no confirmation is needed is that the decision is not irreversible in
the dimension that matters**, so the copy carries one clause about the lessons staying open and that
clause does the work a confirmation dialog would have done badly. **One surface, one primary action,
no second prompt.**

### 10.7 The copy

> **SUPERSEDED BY §10.12 AND KEPT UNEDITED.** These strings assume a per-era three-way fork and no
> longer describe the choice. **What survives verbatim is the frame's headline and every objection
> they were written against**; what goes is the three-option list and the per-era card. §10.12 says
> which strings moved and why.

**Written to the standing objections, and one of them is enforced by a test rather than by review**
(§10.3: the era lines are `ERA_SUMMARIES`, swept for node and domain ids). **No em-dashes, no
comma-fenced asides, no meta-commentary, nothing that leads with a penalty, no internal ids, and
less on screen rather than more.**

#### The frame, four eras

> **Diagnostic complete**
>
> # You answered 57 questions with no lessons, no hints and no retries. Twenty-one skills held.
>
> They cover the city's first four ages. Take any age as it stands, or build it from the lessons
> instead.
>
> `[ Build my city ]`   `[ Change where I start ]`

**Why each line is the way it is.** The headline is D-END5's register applied at the front of the
game: it names the conditions and stops, so it is neither a consolation prize nor a boast, and it is
the sentence §1's finding 5 said was already written in the wrong document
(`2026-07-31-game-completion-ceremony-design.md:323-324`). *"Twenty-one skills held"* is a fact
about the run rather than a compliment about the learner. **No exclamation mark and no "free"**,
which §6.3 found reads as a coupon against the BrainLift's *"here is what you can now do"*
(`docs/BrainLift_Game_Design.md:316`). The primary action is what the learner came to do rather than
a word about the decision.

#### One era card, collapsed and expanded

> **Age 1 of 4**
> ### Prehistoric Era
> counting, sharing, and doing it in the right order
>
> **You place its 6 buildings.** `[ Change ]`

Expanded, by tapping the card or `Change`:

> **Age 1 of 4**
> ### Prehistoric Era
> counting, sharing, and doing it in the right order
>
> Negatives, fractions and percents, and the agreed order of operations that makes two people
> working separately reach the same answer.
>
> **A question from this age:**
> > Simplify: $-3 + 7 \times (2 - 5)$
>
> **○ You place its 6 buildings.** The lessons stay open whenever you want them.
> **○ The city places them.** You can move anything afterwards.
> **○ Start here instead.** Its lessons, its practice and its trial, in full.

**The sample problem is a real prompt from the era's own pool and it is shown unworked**, per
§10.3. It is illustrative here; the shipped one is drawn rather than authored.

#### The reject dial

> **Where would you like to start?**
>
> The city hands over at the **Medieval Era**, which is the first age with skills still to learn.
>
> `[ Earlier ]`  Prehistoric · Neolithic · **Bronze Age** · Classical · **Medieval**  `[ Later ]`
>
> Everything before where you start is built for you. Everything from there on you learn.

#### One era, the whole surface

At one era the ordinal, the dial and the plural all go, because there is one age and two roads.

> **Diagnostic complete**
>
> # You answered 12 questions with no lessons, no hints and no retries. Six skills held.
>
> That is the whole of the Prehistoric Era: counting, sharing, and doing it in the right order.
>
> **A question from it:**
> > Simplify: $-3 + 7 \times (2 - 5)$
>
> **○ You place its 6 buildings.** The lessons stay open whenever you want them.
> **○ The city places them.** You can move anything afterwards.
> **○ Start here instead.** Its lessons, its practice and its trial, in full.
>
> `[ Build my city ]`

#### Nine eras, what changes and what does not

Only the frame's second line and the dial's length change. **The card is identical**, which is the
point of the dial: nine ages is nine rows and one decision rather than nine decisions.

> They cover nine of the city's ten ages. Take any age as it stands, or build it from the lessons
> instead.

**And one line is owed here that is not owed at one or four eras**, because §3.4 and §8.4 both found
this learner served worst and the honest thing is to say what is true rather than to celebrate:

> The city hands over at the **Cyberpunk Era**, and that is the only age with skills still to learn.

#### The four objections, each answered by a specific string

| Objection | The string that answers it |
| --- | --- |
| **Rejecting must not read as confessing weakness** | *"Start here instead. Its lessons, its practice and its trial, in full."* **It names what the road delivers and never why you would take it.** The lead's own framing gave two motives, *"if they feel weak in the content or they just want to see the progression"*, and **one door serves both without labelling either**, so the learner who feels weak uses the same unlabelled door as the learner who wants to watch the age turn |
| **Accepting must not read as a boast** | *"You place its 6 buildings."* A statement about what happens next rather than about how good the learner is. The headline does the same: conditions, then what held |
| **Never lead with the penalty, never say what they should have done** (R33, `.cursor/skills/author/SKILL.md:1084-1089`) | No string on any of these surfaces names a cost, a miss or a should. The closest is *"the first age with skills still to learn"*, which is **"not yet" rather than "you failed"**, exactly as the BrainLift's guardrail 11 requires (`docs/BrainLift_Game_Design.md:324`) |
| **No nag** | There is no second prompt and no *"Are you sure?"*. **The clause that replaces it is *"The lessons stay open whenever you want them"***, which is true by INV-COS-1 and by D-ERA19's shipped layer 3, so the thing a confirmation would have guarded against is guarded by a fact instead (§10.6) |

#### The strings swept mechanically, because four of the objections are mechanical

**Three of the standing objections and three more are shapes a sweep can see, so they were swept
rather than reviewed.** Over the 35 string lines above, excluding the commentary:

```
  em-dash        0
  exclamation    0
  are-you-sure   0
  you-failed     0
  should-have    0
  weak           0
  struggle       0
  free           0
  congrats       0
  node-id shapes  0
  domain-id shapes 0
```

**Read that for exactly what it is worth and no more.** It proves the absences it names, which is
all a sweep can ever prove, and it says nothing about whether the strings are any good. **The two
objections that matter most are not mechanical** and cannot be self-certified: whether rejecting
reads as an admission, and whether the whole thing reads as respect. §8.2's rule applies to my own
prose first: **prose quality is not the author's to certify**, so §10.7 is offered for reading rather
than reported as passing.

**One string I could not make work, recorded rather than hidden.** The third option needs to say
*"start here instead"* on the card and *"everything from there on you learn"* on the dial, and those
are the same fact told twice in different words because the card is per era and the dial is per run.
**Under §10.4's collapse the card's third option and the dial are the same control**, so one of
them should go, and which one is a surface decision rather than a copy decision. **I have written
both rather than picking**, because picking needs the layout that does not exist yet.

### 10.8 What the ruling still owes, and what it no longer owes

**No longer owed, and this is the part worth saying loudest.** No amendment to D-ERA16 or to
D-ERA5's gate, and no reversal of D-ERA17. **Zero questions is the ruled state** (§10.1), so the
ruling is the cheapest of the seven options on the rulings axis and the merged record's own column
says the opposite.

**Still owed, unchanged from §9's costing.**

| Owed | Why the ruling does not remove it |
| --- | --- |
| **D-ET2 repealed for the prologue** | The ceremony *is* the hall rebuilding *"advanced through construction stages by correct answers"* (`2026-07-29-era-trial-contract.md:1204`). Zero questions removes the mechanism and keeps the image, and a clock-advanced four-beat sequence is a different object |
| **D-ET8 voided in substance** | The four beats and their order survive; the pacing arithmetic they are argued from does not, because there are no answers to count. §8.4 measured what is left: **1.31 placements a beat** where D-ET8 rejected 6.00 *answers* a beat as too slow, so **the founding's beats are clock-driven and the document should say so** |
| **D-ET3** | The tested-out learner's ritual is a different object from everybody else's, same as under D and E |
| **`seedFromPlacement` deferred per era** | One whole-city write today, so a per-era reject has nothing to reject. **The largest unpriced engineering item in the ruling** (O-TX12) |
| **The founding's own copy** | §8.2's requirement is untouched. Four advisor beat lines written for a learner who arrived knowing the material, and they are module constants today (`apps/web/src/city/eraCeremony.ts:99,105,111,117`). O-TX6 |

**And one thing the ruling makes newly urgent rather than newly owed.** With zero confirmation the
only measurement anybody will ever get of `P(accept | over-placed)` is a human sitting in front of
the affordance. **§10.3 established that the affordance needs no checker**, so that measurement is
available at era one today, before the widening and before the checker migration. **It is the only
evidence this design can ever have, and it is cheap. O-TX13.**

### 10.9 RULED 2026-08-01: the choice is a STOPPING POINT, and it is a third answer

**O-TX14 asked whether the reject stays a per-era toggle or becomes a boundary. The lead answered
neither, and the third answer is better than both.** Verbatim:

> *"if they decide to stop in era 3, then its as if they were placed into 3 and dont get to skip 4.
> otherwise it gets messy"*

**What it means.** The learner picks **one** thing: the age they land in. Call it `s`. Ages `1` to
`s-1` are founded in one ceremony; from `s` onward is ordinary play. **Stopping at age three means
being placed at age three, so the skip for age four and everything after it is forfeited.**

**The property that makes it clean, stated explicitly because it constrains everything
downstream.** **The skipped set is now necessarily a PREFIX of the era sequence.** That is what
collapses the whole decision to one integer, and it is a fact anything implementing this can rely
on: there is no representation of a gap in the middle, so no surface, no write and no ceremony has
to hold one.

**A second property follows and nobody asked for it, so it is worth naming: the dial is fail-closed
by construction.** `s` is bounded above by the diagnostic's own answer `d`, the first age with
skills still to learn, because moving it later would be the learner authorising a skip the
instrument never cleared. **So the only move the affordance offers is toward more teaching.** It
cannot raise `P(accept | over-placed)`; it can only lower it. **That makes the affordance the one
control in this design that cannot fail open**, and it agrees with the direction of the instrument
it sits on, which INV-DIAG-7 keeps *"biased toward false-negatives (redo easy content) over
false-positives (uncovered gaps)"* (`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md:76`).

#### Why it beats the per-era toggle, and the first reason is measured

```
=====[1] STATE SPACE: what the toggle offered against what is coherent =====
  n = eras in the skipped run. A per-era THREE-way toggle offers 3^n.
  A per-era REJECT toggle offers 2^n, of which only the PREFIXES are buildable
  under one founding, and there are n+1 of those.
  n=1: three-way toggle=    3  reject toggle=  2  coherent prefixes= 2  unbuildable reject states=  0  ruling (stop x 2 build modes)=4
  n=2: three-way toggle=    9  reject toggle=  4  coherent prefixes= 3  unbuildable reject states=  1  ruling (stop x 2 build modes)=6
  n=3: three-way toggle=   27  reject toggle=  8  coherent prefixes= 4  unbuildable reject states=  4  ruling (stop x 2 build modes)=8
  n=4: three-way toggle=   81  reject toggle= 16  coherent prefixes= 5  unbuildable reject states= 11  ruling (stop x 2 build modes)=10
  n=9: three-way toggle=19683  reject toggle=512  coherent prefixes=10  unbuildable reject states=502  ruling (stop x 2 build modes)=20
```

1. **"Otherwise it gets messy" is a measurable statement and this is the measurement.** At nine
   skipped ages a per-era reject toggle offers **512** states of which **10** are buildable under
   one founding, so **502 of them are traps**: a surface offering a choice the ceremony cannot
   express. §10.4 reached the same conclusion by argument; this is the size of it. **The ruling's
   state space is exactly the coherent subset**, which is why it is a collapse rather than a
   restriction.
2. **And the second reason is learner-first and it is the stronger one.** A per-era toggle asks the
   learner to **localise** their weakness, and §8.4 established from the brief that they cannot:
   the persona *"has a vague sense she has 'gaps' but cannot name them"*
   (`docs/Game_Visual_Design_Brief.md:54-55`). **A stopping point asks only for a direction**, which
   is what a vague sense actually is. So the ruling does not merely tidy the state space; it changes
   the question to one the learner can answer.
3. **The protective geometry improves, and this is the part neither of us saw.** Under a toggle,
   rejecting age three protects age three. **Under a stopping point, setting `s = 3` protects age
   three and every age after it.** So a learner whose unease is real but mislocalised, which is the
   only kind this persona has, gets protection for everything downstream of where they stopped
   rather than for the one box they happened to tick. **One correct instinct now covers the whole
   tail.**

#### Why it beats a founding per contiguous run

That was the other option in O-TX14 and it costs the thing the single founding bought. §8.4 measured
Option F's four question-less ceremonies at **0.73 advisor lines a minute against C's 0.57**, which
was F's worst number and the reason §9 took D's packaging. **A founding per run reintroduces it in
proportion to how fragmented the learner's choices are.** Under the ruling there is exactly one
founding at every value of `s`, so the four beat lines are read **once**, which is the floor.

#### What the forfeit costs, priced so the lead can see what he ruled

```
=====[3] WHAT A STOPPING POINT COSTS AND SAVES, four-era learner =====
  s = the age the learner lands in. Skipped = ages 1..s-1. d = 5 (the diagnostic's answer).
  s=1 (prehistoric): skipped ages=0 nodes= 0  forfeited-skip ages=4 nodes=21  practice items owed for the forfeit=105
  s=2 (neolithic): skipped ages=1 nodes= 6  forfeited-skip ages=3 nodes=15  practice items owed for the forfeit= 75
  s=3 (bronze_age): skipped ages=2 nodes=11  forfeited-skip ages=2 nodes=10  practice items owed for the forfeit= 50
  s=4 (classical): skipped ages=3 nodes=16  forfeited-skip ages=1 nodes= 5  practice items owed for the forfeit= 25
  s=5 (medieval): skipped ages=4 nodes=21  forfeited-skip ages=0 nodes= 0  practice items owed for the forfeit=  0
```

**Stopping one age early costs 25 practice items; stopping at age three costs 50.** Those are real
numbers and the copy must not lead with them (R33, `.cursor/skills/author/SKILL.md:1084-1089`), which
is why §10.12 names the forfeit as a fact on the way past rather than as a price. **The record
carries the price; the screen does not.**

### 10.10 The build mode is ONE choice, and D-ERA18 narrows it further than that

**The steer was to make it one, for the reason the lead gave, and it is right. The argument is worth
making rather than adopting, because two of its four legs are new and one of them changes my own
§10.5.**

1. **A per-era build toggle is the same mess without the excuse.** It is `2^n` states again, **16**
   at four ages and **512** at nine. Unlike the reject toggle, **every one of those states is
   coherent**, so the prefix property does not rescue it. There is nothing to collapse it with
   except a decision.
2. **The founding is one continuous event.** Its beats span the run rather than an era, which is
   what D-ET8 becomes under the ruling, so a build mode changing partway means the learner
   alternates between placing and watching **inside one ceremony**. That is a mode switch in the
   middle of a single act.
3. **D-TH9 makes it the cheapest mistake on the screen.** Every placed building is movable
   afterwards, *"purely spatial (no mastery/stage/star change)"*
   (`docs/superpowers/specs/2026-07-25-town-hall-design.md:759`), and D-ERA18 says it to exactly
   this case: *"Everything stays movable afterwards (D-TH9), so nothing auto-placed is permanent"*
   (`2026-07-27-era-progression-design.md:2007-2008`). **So per-era precision buys nothing a later
   rearrangement cannot.**
4. **And D-ERA18 already scopes it, which is narrower than the steer and CORRECTS §10.5.** The
   ruling is *"every student places era one by hand; later eras auto-fill during the montage"*
   (`:1994`, row at `:2644`), and its stated reason is that *"the agency and the teaching both land
   the first time; repeating them is repetition rather than learning"* (`:2004-2005`). **Two
   consequences.** Age one is hand-placed regardless and is **not** part of the choice, so the build
   mode covers ages two to `s-1` only. And **the ruled default is the city placing them, not the
   learner**, which is the opposite of what §10.5 recommended on agency grounds. **§10.5 is
   corrected here rather than edited**: the agency lands in age one by ruling, so defaulting the
   rest to the learner was buying agency twice and charging 40 seconds a building for the second
   one.

**So: one choice, scoped to ages two through `s-1`, defaulting to the city, with age one always
placed by hand.**

**And measured, most learners never see the control at all.**

```
=====[5] THE AFFORDANCE'S OWN SIZE, by era count =====
  d= 2 (neolithic): skippable ages=1  dial positions= 2  build-mode control shown=false  sample problems on screen=1
  d= 3 (bronze_age): skippable ages=2  dial positions= 3  build-mode control shown=true  sample problems on screen=1
  d= 5 (medieval): skippable ages=4  dial positions= 5  build-mode control shown=true  sample problems on screen=1
  d=10 (cyberpunk): skippable ages=9  dial positions=10  build-mode control shown=true  sample problems on screen=1
  Era one is hand-placed by D-ERA18 regardless, so at d=2 the build mode has no subject.
```

At `d = 2`, which is a learner who tested out of age one only, **the skipped set is age one, age one
is hand-placed by ruling, and the build mode has no subject**. §3.2's base rates put that at 42.1%
of generated students, and another 26.8% test out of nothing. **So roughly two learners in three
never meet a build-mode choice**, and the surface they meet is two buttons.

**The one case this gives up.** A learner who wants to place age two by hand and let the city do
ages three and four. **Real but thin**, and it is recoverable in the only currency it costs, which
is arrangement, because D-TH9 keeps everything movable. **Not carried as an open item**, because
reopening it means reopening `2^n`.

### 10.11 The recognition surface under a single choice, and a measurement that refuted my first answer

> **SUPERSEDED IN APPLICATION 2026-08-01, NOT IN FACT, and kept in full for that reason.** The lead cut
> the sample problem and the dial: *"dont need to have this."* **So the dial-as-probe is dead and every
> finding underneath it stands**, and the next person to propose a confidence check at this moment
> should find them here rather than re-derive them. **Three survive and cost real work:** that
> recognition beats self-assessment because a self-assessment question asks the learner to search
> memory for an absence; that **a worked example would have inflated confidence in exactly the learner
> who cannot do it** (Category 4 at `docs/BrainLift_Game_Design.md:273,281,283`), which is the finding
> that killed it before the lead cut it for a different reason; and the **37-of-85 backward-edge
> measurement** below, which refuted my own first answer and is the reason the last-skipped-age
> argument had to be marginal rather than inferential. §10.15 applies the first of the three to the
> skills list that replaced the problem.

**The question is what the learner looks at, now that there is one choice rather than one per
era.** §10.3's correction still binds and is untouched: **show the problem, never the solution**,
because exposure inflates confidence (`docs/BrainLift_Game_Design.md:273,281,283`).

**My first answer was going to be that the last skipped age dominates, on the grounds that it sits
downstream of the earlier ones in the prerequisite graph. Measured, that is not true enough to rest
on.**

```
=====[4] IS THE LAST SKIPPED AGE THE HIGHEST-INFORMATION PROBE? =====
  Per era: how many of its nodes' prerequisites lie in an EARLIER era.
  prehistoric       nodes= 6  prereq edges= 7  into earlier eras= 0  within this era= 7
  neolithic         nodes= 5  prereq edges= 8  into earlier eras= 3  within this era= 5
  bronze_age        nodes= 5  prereq edges= 6  into earlier eras= 1  within this era= 5
  classical         nodes= 5  prereq edges= 5  into earlier eras= 2  within this era= 3
  medieval          nodes= 5  prereq edges= 8  into earlier eras= 3  within this era= 5
  renaissance       nodes= 6  prereq edges= 8  into earlier eras= 6  within this era= 2
  industrial        nodes= 6  prereq edges=10  into earlier eras= 3  within this era= 7
  atomic_age        nodes= 9  prereq edges=14  into earlier eras=10  within this era= 4
  information_age   nodes= 6  prereq edges= 8  into earlier eras= 4  within this era= 4
  cyberpunk         nodes= 9  prereq edges=11  into earlier eras= 5  within this era= 6
  TOTAL: 37 of 85 prerequisite edges cross into an earlier era (43.5%)
```

**Only 43.5% of prerequisite edges cross an era boundary backwards**, and the Bronze Age's is **1 of
6**. So being able to do age three's mathematics licenses very little about ages one and two, and
the era sequence is not the prerequisite nesting an inferential argument would need. **That agrees
with a ruling rather than contradicting one:** D-ERA17 says *"domains are a prerequisite graph but
eras are strictly linear, so a student's knowledge may not be a prefix of the sequence"*
(`2026-07-27-era-progression-design.md:2023-2024`).

**So the justification has to be marginal rather than inferential, and the marginal one survives
the measurement intact.** Moving the dial one step, from `s` to `s-1`, changes **exactly one age**
from handed to played, and that age is `s-1`. **So the evidence a dial step needs is age `s-1`'s
material**, not because it implies anything about ages before it, but because it is the thing the
step is about.

**The answer, then: one problem, drawn from the age the current position would hand over LAST, and
it changes as the dial moves.**

- **One at a time rather than a list**, because the learner is evaluating a boundary rather than n
  ages, and because a list of nine prompts is the opposite of less on screen.
- **It changes with the dial**, which is the part worth building: **it turns the dial into a probe.**
  The learner slides it and the mathematics gets easier or harder in front of them, so the control
  teaches them what it is asking about while they use it.
- **And the failure direction is safe.** As the dial moves earlier the problems get easier, so a
  learner who keeps moving until something looks trivial ends up asking for more teaching than they
  needed. That costs them time (§10.9's table prices it) and it cannot cost them a foundation,
  which is the trade this whole design is built to make.

### 10.12 The strings, rewritten for a stopping point

> **SUPERSEDED BY §10.19 AND KEPT UNEDITED.** These assume an upfront dial with a sample problem on
> it. **The headline, the forfeit clause's shape and every objection they were written against carry
> forward**; the dial, the sample problem and the run-level framing do not. §10.19 says which strings
> moved and why, and it closes O-TX16 by putting *"the lessons stay open"* where a per-era prompt makes
> it belong.

**§10.7's three options assumed a per-era fork and no longer describe the choice. They are
superseded rather than deleted, and the objections they were written against all still apply**: name
what the road delivers and never why you would take it, no admission in either direction, no
confirmation prompt.

#### The whole surface, four ages, at the default position

> **Diagnostic complete**
>
> # You answered 57 questions with no lessons, no hints and no retries. Twenty-one skills held.
>
> They cover the city's first four ages. You start at the **Medieval Era**, and everything before it
> is founded for you in one go.
>
> **Start earlier if you would rather learn any of them.**
>
> `Prehistoric` · `Neolithic` · `Bronze Age` · `Classical` · **`Medieval`**
>
> All four ages are founded for you. You learn from the Medieval Era on.
>
> **A question from the Classical Era, the last age you would be handed:**
> > Factor: $x^2 + 7x + 12$
>
> **Those buildings**
> **○ The city places them.** You can move any of them afterwards.
> **○ You place them yourself.**
> You place the Prehistoric Era's six either way.
>
> `[ Build my city ]`

#### The same surface after the learner moves the dial to the Bronze Age

Two lines change and one of them is the forfeit.

> `Prehistoric` · `Neolithic` · **`Bronze Age`** · `Classical` · `Medieval`
>
> The Prehistoric and Neolithic ages are founded for you. You learn from the Bronze Age on, and the
> Classical Era comes with it.
>
> **A question from the Neolithic Era, the last age you would be handed:**
> > Simplify: $\sqrt{48}$

**"And the Classical Era comes with it" is the forfeit**, and it is the hardest string on the
surface. It is a fact placed on the way past rather than a price placed in front, which is R33's
shape (`.cursor/skills/author/SKILL.md:1088-1089`), and it does not say what the learner gave up, what
it cost, or what they might have done instead. **It appears only when the forfeit is non-empty**, so
a learner at the default never reads it.

#### One age, the whole surface

At `d = 2` the dial has two positions and the build mode has no subject (§10.10), so both controls
go and two buttons are the surface.

> **Diagnostic complete**
>
> # You answered 12 questions with no lessons, no hints and no retries. Six skills held.
>
> That is the whole of the Prehistoric Era: counting, sharing, and doing it in the right order.
>
> **A question from it:**
> > Simplify: $-3 + 7 \times (2 - 5)$
>
> `[ Place my six buildings ]`   `[ Learn it instead ]`

#### Nine ages

The card is identical and only the frame's second line, the dial's length and one closing line
change.

> They cover nine of the city's ten ages. You start at the **Cyberpunk Era**, and everything before
> it is founded for you in one go.
>
> `Prehistoric` · `Neolithic` · `Bronze Age` · `Classical` · `Medieval` · `Early Modern` ·
> `Industrial` · `Atomic Age` · `Information Age` · **`Cyberpunk`**
>
> The Cyberpunk Era is the only age with skills still to learn.
>
> **A question from the Information Age, the last age you would be handed:**
> > Evaluate: $\log_{2} 32$

#### Every string's job, and which objection each one answers

| String | What it is doing |
| --- | --- |
| *"You answered 57 questions with no lessons, no hints and no retries. Twenty-one skills held."* | D-END5's register moved to the front of the game (`2026-07-31-game-completion-ceremony-design.md:323-324`). Conditions, then what held. **No exclamation mark and no "free"**, which §6.3 found reads as a coupon |
| *"You start at the Medieval Era"* | The diagnostic's answer stated as a fact rather than as a recommendation the learner must evaluate. **Not "we suggest" and not "you qualify for"** |
| *"Start earlier if you would rather learn any of them."* | **The whole admission problem, answered in one clause.** *"Would rather learn"* is a preference. It gives the lead's own two motives, *"if they feel weak in the content or they just want to see the progression"*, one unlabelled door, so the learner who is shaky and the learner who wants to watch the age turn press the same thing and neither is named |
| *"and the Classical Era comes with it"* | The forfeit, on the way past. Shown only when it exists |
| *"A question from the Classical Era, the last age you would be handed"* | The recognition surface (§10.11). **The prompt is unworked**, because exposure inflates confidence |
| *"The city places them. You can move any of them afterwards."* | D-TH9 stated to the learner, which is what makes the cheaper option safe to default to |
| *"You place the Prehistoric Era's six either way."* | D-ERA18's hand-placed age one, said once and not argued |
| *"Learn it instead"* (one age) | The same door as the dial, at the one size where a dial is silly |
| **Absent: any confirmation** | Unchanged from §10.6. The lessons stay open by INV-COS-1 (`packages/economy/src/capacity.ts:46-48`) and D-ERA19's shipped layer 3, **so there is nothing for an "Are you sure?" to guard** |

**One thing I removed rather than rewrote.** §10.7's option line *"The lessons stay open whenever you
want them"* is gone from the choice list, because under a stopping point it belongs to the frame
rather than to one option: **it is true of every position on the dial.** It should appear once, near
the primary action, and I have not written it into a slot because where it sits is a layout question
(O-TX15's successor, and §10.12's own version of the same problem §10.7 admitted).

#### Swept mechanically, same as before and for the same reasons

```
  em-dash        0
  exclamation    0
  are-you-sure   0
  you-failed     0
  should-have    0
  weak           0
  struggle       0
  free           0
  congrats       0
  node-id shapes  0
  domain-id shapes 0
```

**Worth exactly what the last sweep was worth.** It proves the absences it names. **Whether
*"Start earlier if you would rather learn any of them"* reads as an invitation or as a hint that
something is wrong with you is not a shape a sweep can see**, and it is the one string in the set
whose failure would take the whole design with it.

### 10.13 What moves in the measured numbers, and the nine-era learner

**The residual does not move, and saying so rather than assuming it was the right instruction.**
`P(accept | over-placed)` is still the target and still unlocated in `[0, 1 in 50]` (§10.2). The
ruling changes **the shape of the decision rather than the risk**, in two ways that both point the
same direction:

- **The dial cannot fail open** (§10.9), because `s` is bounded above by the diagnostic's answer. So
  the affordance's own contribution to the residual is **zero or negative, never positive.**
- **One correct instinct now protects the whole tail** rather than one age (§10.9). So for the same
  learner accuracy the residual is **lower** than under the toggle. **That is an argument and not a
  measurement**, because it multiplies by a human quantity nothing in this repository can measure,
  which is O-ACC3 and is unchanged.

**The time block moves, and it moves a lot.**

```
=====[2] THE BLOCK AFTER THE DIAGNOSTIC, four-era learner =====
  C: trial is the test-out (42q)           q=42 place=21 ceremonies=0 choices=0  => 28.0 min
  D: one founding (42q)                    q=42 place=21 ceremonies=0 choices=0  => 28.0 min
  F+D as costed (0q, 4 per-era choices)    q= 0 place=21 ceremonies=1 choices=4  => 18.5 min
  RULING, city places ages 2 to 4          q= 0 place= 6 ceremonies=1 choices=1  => 6.3 min
  RULING, learner places all               q= 0 place=21 ceremonies=1 choices=1  => 16.3 min
  RULING, learner stops at age 3           q= 0 place=11 ceremonies=1 choices=1  => 9.6 min
```

**At the default the block is 6.3 minutes, against 18.5 for the same combination as costed in §9 and
28 for C.** The reason is §10.10's corrected default: 6 placements rather than 21, because D-ERA18
auto-fills ages two onward. **So the ruling plus that correction is the first thing in this record
that answers the lead's original complaint on the axis he raised it on.** §8.4 measured that
removing all 42 questions saved only 6 minutes of 28 because *"the placements were always the
cost"*; **this is the change that touches the placements**, and it does it without taking agency
away, because age one is still hand-placed and everything else is movable.

**And the honest note beside it: at the default this learner does not place ages two to four, so the
21-placement figure that ran through §6.2 and §8.6 describes the option where they choose to.** The
agency is still available at every value of the dial. It is no longer the default, and D-ERA18's
reason for that is on the record.

**One metric stops meaning anything and I am not going to quote it as if it still did.**

```
=====[6] ADVISOR-LINE DENSITY, unchanged by the ruling =====
  C, four ceremonies                       advisor lines=16  block=28.0min  lines/min=0.57
  F, four question-less ceremonies         advisor lines=16  block=22.0min  lines/min=0.73
  RULING, one founding, city places        advisor lines= 4  block=6.3min  lines/min=0.63
  RULING, one founding, learner places all advisor lines= 4  block=16.3min  lines/min=0.25
```

**The 0.63 in the third row is arithmetically correct and is not a repetition finding.** The metric
was built to measure the same four strings being read four times, and under one founding they are
read **once**, which is the floor. A shorter block raises lines per minute without any line
repeating. **The number that carries the original finding is the repeat count, and the ruling's is
1**, against C's 4 and F's 4.

#### The nine-era learner: F's worst case, and the ruling's largest beneficiary

§3.4 and §8.4 both found this learner served worst, so this is where the ruling earns most.

| | Under the per-era toggle | Under the ruling |
| --- | --- | --- |
| Decisions to make | **9**, three-way | **1** integer, plus one build mode |
| States the surface offers | **19,683** | **20** |
| Ceremonies | up to 9 | **1** |
| Advisor-line repeats | up to 9 | **1** |
| Block at the default | 22 minutes and up | **about 8 minutes** at 6 placements, 1 founding, 1 choice |

**And the honest limit, which the ruling does not fix.** At nine ages, with the city placing, the
founding is a clocked montage with nothing the learner does inside it. **That is Option B**, and it
is also D-ERA18, the ruled state (§8.5). Two things make it defensible here rather than everywhere:
this is the learner for whom the conjunction argument makes the placement safest, since #386's
structural finding is that *"the conjunction multiplies the fail-open probability down… harder the
larger the era"* (`2026-08-01-diagnostic-placement-accuracy.md:251-255`, now on `integration`);
and the dial is what makes it consensual rather than imposed, which is the whole difference between
this and Option B as the merged record costed it.

**What still fails at nine ages, unchanged.** The shipped auto-layout seats **24 of 53** buildings
on any authored ground that exists (§8.4), so the montage has nowhere to put more than half of them.
**That is the land-authoring dependency and it is not this decision's to fix.** O-TX4 stands.

### 10.14 REVISED 2026-08-01: the walk is per era, the beats play at each one, and the surface loses its probe

**Two further changes the same day, and they arrived after §10.9 to §10.13 were written.** On the
surface:

> *"dont need to have this - just let the user pick if they want to start at this era. basically itll
> take them through each era up to where theyre placed, and at each one they can choose to stop the
> progression now and work through these nodes, which stops the remaining eras after it"*

On the beats:

> *"my thinking is having the four beats would still be cool, since theres real re-theming that
> happens. maybe they could be slightly faster then they would normally?"*

And on what the prompt shows:

> *"maybe it should list the skills within the era so that the user can see what it covers to inform
> whether they want to advance or not"*

**The shape, in four lines.**

1. The run **walks each skipped age in order**, up to the placed age.
2. **The four beats play at each age**, faster than an ordinary advance (§10.17).
3. **At each age the learner may stop.** Stopping means working that age's skills properly, and every
   skip after it is off.
4. **The prompt shows the age's skill names.** No sample problem and no worked example.

**What survives untouched, and it is most of the previous two rulings.** The **prefix property**
holds: stopping still ends all later skipping, so the outcome space is the same **20** states against
a toggle's 512 and a three-way toggle's 19,683 (§10.9). **Zero confirmation questions**, **D-ERA17
making that the cheapest on rulings** (§10.1), **the build-mode answer** (one, D-ERA18, age one by
hand and later ages city-placed, which took the block from 16.3 minutes to 6.3, §10.10), and **the
re-offerable clause** (§10.6) are all unchanged. **What moves is where the decision is asked, how
many times the beats play, and what is on screen when the learner decides.**

**Two of the strongest results from §10.9 survive the move to a per-era prompt and are what makes the
new shape safe, so they are restated rather than assumed.**

- **The choice still cannot fail open.** At each age the learner may stop, which shortens the skipped
  prefix, or continue, which is the diagnostic's own answer. **There is no move that lengthens the
  prefix beyond what the instrument cleared.** So the affordance's contribution to the residual is
  zero or negative at every prompt, and it agrees with INV-DIAG-7 keeping the instrument *"biased
  toward false-negatives (redo easy content) over false-positives (uncovered gaps)"*
  (`docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md:76`).
- **It still asks for a direction rather than a localisation.** *"Stop here"* is the same
  single-bit-per-prompt question a dial position was, and §8.4's citation is why that matters: the
  persona *"has a vague sense she has 'gaps' but cannot name them"*
  (`docs/Game_Visual_Design_Brief.md:54-55`). **Asked once per age rather than once per run, the
  learner is asked for a direction four times instead of once**, which is more chances to get it
  right and more chances to be wrong, and nothing here can say which dominates.

**One thing the per-era prompt buys that the dial did not.** The learner is **standing in the age
they are deciding about**, with its ground, its hall and its dressing already turned. **The dial
asked them to judge an age they had not seen; the walk shows it to them first.** That is a real
argument for the lead's shape and it is not one either of us made when the dial was on the table.

### 10.15 The skills list: what it buys, what it does not, and where it does not fit

> **SUPERSEDED IN PLACEMENT 2026-08-01, NOT IN SUBSTANCE, and §10.20 records a correction to this
> section's own text.** The lead ruled the skills behind a disclosure: *"it doesn't have to show in the
> main screen, but it should still be viewable."* **So the list leaves the well and everything this
> section says about what it buys and what it does not is unchanged**, including the finding that it
> does not move `P(accept | over-placed)`. **What is corrected is the last paragraph**: this section
> called the disclosure option *"the one that gives up most of what the list was for"*, and it gives up
> nothing the list was for, because the skills are still viewable. §10.20.

**Where the strings come from.** `lessonByNode[nodeId].title`
(`apps/web/src/lessons/domains.ts:163-165`), which is the same source the shipped ceremony already
uses for a learner-facing skill name (`apps/web/src/city/EraAdvanceCeremony.tsx:241-243`). **A node id
cannot leak from that path**, because a title is authored prose rather than a key. **And beside it,
one line for the age from `ERA_SUMMARIES[era].concept`, whose no-node-ids discipline is enforced by a
sweep rather than by review**: `eraTimeline.test.ts:67-71` sweeps all 20 of its strings against 62 or
more product node ids and 10 or more domain ids and fails on either, with a counter-example at
`:87-97` proving the sweep measures something (§10.3).

**Say the value plainly and do not soften it.** A skill name answers **what is in here**. A problem
answers **can I do it**. Only the second is diagnostic, and the list is the first.

- **It improves the quality of the decision**, because the learner now knows what they are choosing
  over instead of choosing over an era name.
- **It does not move `P(accept | over-placed)` much**, and §10.3's finding is what predicts that
  rather than a fresh argument: judging *"do I know Order of operations"* from a label **is** the
  self-assessment the persona cannot do reliably. The list changes the label from an era to a skill.
  It does not change the question from a memory search into a comparison.
- **And it is safe, which is the other half.** A list of names **cannot manufacture the feeling of
  competence**, so the Category 4 finding that killed the worked example
  (`docs/BrainLift_Game_Design.md:273,281,283`) does not reach it. **There is no confidence-inflation
  cost.** That is the whole reason it is worth adding despite the paragraph above.

**How many, measured, and three eras cannot supply it at all.**

```
=====[3] THE SKILLS LIST, per era =====
  prehistoric       skills= 6  with an authored title= 6  longest title=43 chars
  neolithic         skills= 5  with an authored title= 5  longest title=46 chars
  bronze_age        skills= 5  with an authored title= 5  longest title=57 chars
  classical         skills= 5  with an authored title= 5  longest title=67 chars
  medieval          skills= 5  with an authored title= 5  longest title=53 chars
  renaissance       skills= 6  with an authored title= 3  longest title=65 chars
  industrial        skills= 6  with an authored title= 0  longest title= 0 chars
  atomic_age        skills= 9  with an authored title= 4  longest title=52 chars
  information_age   skills= 6  with an authored title= 6  longest title=67 chars
  cyberpunk         skills= 9  with an authored title= 0  longest title= 0 chars
```

**Five eras can render the list today and five cannot render it fully**, with the Industrial and
Cyberpunk eras at **zero of six** and **zero of nine**. That is the same content dependency the
sample problem had (§10.3's third point) and it is not this design's to fix. **What it means for the
surface is that the concept line has to carry the age on its own where titles are missing**, which is
the fallback and is already authored for all ten.

**Era one's list and era four's, verbatim, because the lengths are the finding:**

```
  Era one's list, verbatim:
    Signed numbers
    Fractions
    Order of operations
    Field properties / distributive
    Simplify / combine like terms
    Ratios, rates, proportions, percents, units
  Era four's list, verbatim:
    Add, subtract and multiply polynomials
    Factor polynomials
    Solve quadratics by factoring and the square-root property
    Solve quadratics by completing the square and the quadratic formula
    Polynomial long and synthetic division
    Largest era = 9 skills.
```

**Two of era four's five titles are over 55 characters and one is 67.** These are authored as lesson
headings rather than as list items, and *"Solve quadratics by completing the square and the quadratic
formula"* is a sentence.

#### At 1024x580 it does not fit, and this is arithmetic rather than a rendered frame

> **THIS IS THE PROBLEM THE RULING DISSOLVES, and §10.22 re-takes the budget.** With one concept line in
> the well instead of six to nine titles, the prompt is **192px against 289px with 97px spare** rather
> than 312px against 289px. **The overflow below is a true measurement of a surface that is no longer
> proposed.**

```
=====[4] THE 1024x580 BUDGET, arithmetic and NOT a rendered frame =====
  well=289px at line-height 20px fits 14 lines
  well=289px at line-height 24px fits 12 lines
  well=289px at line-height 28px fits 10 lines
  6-skill era: 7 chrome lines + 6 list lines = 13 lines  => 312px at 24px, against 289px  OVERFLOWS
  9-skill era: 7 chrome lines + 9 list lines = 16 lines  => 384px at 24px, against 289px  OVERFLOWS
```

**The answer to "does it stay fine at the largest era" is no, and it is already no at six.** A
six-skill age needs **312px against 289px** and a nine-skill age needs **384px**, before any title
wraps, on a budget of seven chrome lines (two for the headline, two for the concept, one spacer, two
for the buttons). **And the wrap makes it worse rather than marginal**: a 67-character title will take
two lines in any well narrow enough to sit inside 1024px, so era four's real list is closer to eight
lines than five and era nine's to nine than six.

**Now the part `.cursor/rules/qa-verification.mdc` requires me to say, because the rule is aimed at
exactly this claim.** A dimension is a claim about CSS and *"can you see the island behind it"* is a
claim about a rendered frame. **I have the first and cannot have the second, because the surface does
not exist: there is nothing to photograph.** So the numbers above are **a budget for whoever builds
it, not a measurement of anything**, and the spatial claim is **unverified** until somebody renders it
at 1024x580 and looks. **What the budget is good for is telling them it will not fit as a plain
one-line-per-skill list**, which is worth knowing before the layout is drawn rather than after.

**Three ways out, none of them chosen here.** Two columns at six skills and three at nine; a
shortened display label authored beside the lesson title, which is new copy in Evan's lane; or the
concept line alone with the skills behind a disclosure. **The third is the only one that costs
nothing and it is the one that gives up most of what the list was for.** Carried as **O-TX18**.

### 10.16 The residual under the simpler surface, recorded as his ruling

**RULED 2026-08-01. With nothing on screen but the skill names and stop-or-continue,
`P(accept | over-placed)` is UNADDRESSED BY DESIGN rather than targeted by it. The residual stands at
its bound.**

| | Figure | Status |
| --- | --: | --- |
| Era-one fail-open rate, full scope | **2.0%** | Measured, `2026-08-01-diagnostic-placement-accuracy.md:210`, now on `integration` |
| Residual under the ruling | **`2.0% × P(accept \| over-placed)`** | Bounded above by **1 in 50**, below by 0 |
| What is now pushing that conditional down | **Nothing on the screen** | The dial-as-probe is cut (§10.11). The skills list informs the choice without changing its kind (§10.15) |
| What is still pushing it down | **The instrument's own bias, and the walk** | Precision 97.3% to 100% per era, and the learner now sees each age before deciding (§10.14) |

**So the honest statement, and it must not be softened by the list.** §10.2 recorded a residual that
a designed affordance was aimed at. **This revision keeps the residual and removes the aim.** The
skills list is an improvement to the *decision* and not a mitigation of the *risk*, and §10.15 says
why in the terms §10.3 established. **1 in 50 is the bound, nothing on the surface moves it, and that
is a ruling rather than an oversight.**

**Two things that are true and are not mitigations either.** The fail-open cases still surface later
as difficulty in ordinary play, because INV-ERA-2 retains every node and the lessons stay open
(§10.6). And **the walk itself is weakly protective**: a learner standing in an age they cannot read
has more to go on than a learner reading its name off a dial. **Neither is measurable and neither is
claimed as safety.** **O-TX10 stays open and is now the only bar-setting item left**, because there is
no longer a mechanism whose effectiveness could be argued in its place.

### 10.17 The advisor goes silent during the catch-up, and "faster" is a number

#### The tension, and it is real

§10.13 retired advisor-lines-per-minute as a metric and said **the repeat count is the number that
carries the finding**. The lead has asked for the beats at every age, which is four plays.

```
=====[6] BEAT-LINE REPEAT COUNT =====
  C, four era ceremonies             ceremonies=4  advisor lines shown=16  distinct strings=4  repeats of the four=4
  one founding (previous shape)      ceremonies=1  advisor lines shown=4  distinct strings=4  repeats of the four=1
  per-era walk, advisor NARRATING    ceremonies=4  advisor lines shown=16  distinct strings=4  repeats of the four=4
  per-era walk, advisor SILENT       ceremonies=4  advisor lines shown=0  distinct strings=4  repeats of the four=0
```

**Narrating, the per-era walk is exactly Option C's repeat count**, which is the number §4.4 called
C's single worst and §9 took D's packaging to avoid.

#### Silence, and his own reason is the argument for it

**His reason points at the resolution and I am taking it further than he did: the re-theming varies
per age, so the VISUAL is what differs and the NARRATION is what repeats.** The four `line` fields
are module constants on `CEREMONY_BEATS` (`apps/web/src/city/eraCeremony.ts:99,105,111,117`), where
the ground, the water, the vegetation, the roads and the hall are per-era authored art. **So the
repetition lives entirely in the words, and dropping the words removes all of it and none of what he
wants.**

**Recommend: the advisor is SILENT through the catch-up, and speaks twice at most.**

1. **When the learner stops**, because that is a decision they made and the product should meet it.
2. **On arrival at the placed age**, because that is where the catch-up ends and the game begins.

**Four reasons, and the second is the one that decides it.**

1. **Repeat count 0 against 4**, measured above. It is the floor and nothing else on the table
   reaches it.
2. **The four lines are WRONG for this learner, not merely repetitive.** *"They are coming in from
   every corner of the island. Nobody wants to miss this."* said over the **eight** founding citizens
   §7.1 measured, in the first ten minutes of a first session, over a city the learner did not build.
   **Cutting them fixes a falsehood and a repetition with one edit**, and §8.2 already owed the
   rewrite. **Silence is the cheapest possible discharge of that debt.**
3. **The advisor is still IN the beat.** D-ET8's beat one is a composite that includes *"the advisor
   changes dress"* (`2026-07-29-era-trial-contract.md:1210`), so the costume change still lands at
   every age and it is per-era art. **What goes is the speech, not the character**, and D-ET9's one
   continuous advisor across ten eras is untouched: a guide who walks with you does not narrate every
   step.
4. **It makes the first speech land harder, which is D-END5's escalation applied to sound.** Under
   silence the first words the advisor says are at the learner's first **earned** advance. Under
   narration they are the same four sentences the learner already heard four times. **The catch-up
   becomes a montage of history and the first real advance becomes the moment somebody turns and
   talks to you.**

**What I am NOT recommending, and why.** Varying the lines per era is **sanctioned**: D-ET3 lists
*"the advisor's short speech"* among the five things that may vary, and §4.4 found the slot empty. **It
is the right answer for the ordinary ten-era progression and the wrong one here**, because it costs
authoring in Evan's lane to solve a problem that deleting solves for nothing, and because it does not
touch reason 2 at all: a per-era line about a crowd is still a line about a crowd of eight.

**One thing silence does not fix, said rather than hidden.** The beat **labels** repeat too, at four
labels over four ages, and they are the same strings (`eraCeremony.ts:98,104,110,116`). **A caption
naming what you are watching is a smaller defect than a narrator asserting something false about
it**, because the image under the caption differs every time, but it is not zero. Keep the labels,
and if one of them has to go it is beat one's.

#### "Slightly faster" as a number, and the honest correction first

**It cannot be a comparison, because an ordinary advance has no duration.** The shipped ceremony is
**answer-paced**: `beatQuotas` distributes the era's checks across the four beats
(`apps/web/src/city/eraCeremony.ts:207-243`) and a beat waits indefinitely between answers. **So there
is nothing to be a percentage of**, and "slightly faster" has to become an absolute budget.

**And the budget has a floor that is not this design's to pick.** Beat one is citizens walking to a
gathering point, and the walk speed is a shipped constant:

```
=====[2] BEAT ONE'S FLOOR, derived from the shipped walk speed =====
  citizens-tuning WALK_SPEED_UNITS_PER_SEC = 1.6
  A citizen at the rim walks up to `radius` units to a centre gathering point.
  prehistoric       radius=22  rim-to-centre walk = 13.8s
  neolithic         radius=30  rim-to-centre walk = 18.8s
  bronze_age        radius=35  rim-to-centre walk = 21.9s
  classical         radius=42  rim-to-centre walk = 26.3s
  medieval          radius=46  rim-to-centre walk = 28.8s
```

**At the shipped speed beat one alone is 13.8 seconds at age one and 43.1 seconds at the widest
authored radius**, and it **rises with the age** because the island gets bigger. So a fixed
per-ceremony duration is the wrong shape: the same number would be generous at age one and impossible
at age nine.

**So express it as a multiplier on the one shipped clock, which is checkable in a line of test.**

```
  x1.0 (=1.6 u/s): preh=13.8s  clas=26.2s  cybe=43.1s  worst(r=69)=43.1s
  x1.5 (=2.4 u/s): preh= 9.2s  clas=17.5s  cybe=28.7s  worst(r=69)=28.7s
  x2.0 (=3.2 u/s): preh= 6.9s  clas=13.1s  cybe=21.6s  worst(r=69)=21.6s
  x2.5 (=4.0 u/s): preh= 5.5s  clas=10.5s  cybe=17.2s  worst(r=69)=17.2s
```

**The recommendation, as three numbers a reviewer can check.**

| | Value | Why this one |
| --- | --- | --- |
| **Catch-up walk speed** | **2× `WALK_SPEED_UNITS_PER_SEC`**, so 3.2 units a second | At 2× beat one is **6.9s** at age one and **21.6s** at the widest radius, so it never exceeds **36%** of the ceiling below. At 1.5× the worst case is 28.7s, which is half the ceiling on one beat |
| **Target for the four beats** | **45 seconds** at age one | Leaves 38 seconds for beats two to four after beat one's 6.9s, against beat three's six internal `REBUILD_STAGES` phases |
| **Ceiling at any age** | **60 seconds** | The widest radius' beat one is 21.6s at 2×, so the ceiling holds at every authored era rather than only at the ones measured |

**Do not raise the multiplier past 2× to buy more headroom.** The visual brief's §4.6 rules
**MODERATE** juice, *"calm, low-amplitude"*, and *"Celebration amplitude stays low and earned"*
(`docs/Game_Visual_Design_Brief.md:73`). **Citizens sprinting is a different tone, not a faster one**,
and reduced motion has to remain a supported path, which is where the real floor on perceived speed
sits.

### 10.18 The four-age walk, re-measured

```
=====[5] THE FOUR-AGE WALK, re-measured =====
  Age one hand-placed (D-ERA18), ages two to four city-placed, four stop prompts,
  four accelerated ceremonies at T seconds each.
  T=30s: 6 placements + 4 prompts + 4 ceremonies => 7.0 min  (one-founding shape was 6.3 min)
  T=45s: 6 placements + 4 prompts + 4 ceremonies => 8.0 min  (one-founding shape was 6.3 min)
  T=60s: 6 placements + 4 prompts + 4 ceremonies => 9.0 min  (one-founding shape was 6.3 min)
  T=90s: 6 placements + 4 prompts + 4 ceremonies => 11.0 min  (one-founding shape was 6.3 min)
```

**At the 45-second target, the four-age walk is 8.0 minutes against the one-founding shape's 6.3.**
So the lead's change costs **1.7 minutes** and buys four re-themings the learner watches separately
rather than one continuous sweep. **At the 60-second ceiling it is 9.0 minutes and the cost is 2.7.**

**The stop prompt is timed at 15 seconds and that is invented**, like the other two rates. It is
lighter than the 45 seconds §10.13 allowed for the upfront dial, because a two-button decision with a
list on screen is a shorter read than a dial with a problem on it. **If it is 30 seconds instead, the
walk is 9.0 minutes at the 45-second target**, which is the same as the ceiling case and still under
the 18.5 minutes the same combination cost before §10.10's build-mode correction.

**Beat-line repeats: 0 under §10.17's silence, against 4 narrating and 1 for the one founding.** So
**the revision's repeat count is better than the shape it replaces**, which is the opposite of what
the tension in the brief predicted, and it is entirely because the words came out rather than because
the ceremonies did.

**The whole block, end to end, against the earlier shapes.** Twenty minutes of diagnostic and one
minute of reward screen are common to all of them (§5's prologue), so the four-age learner reaches
their first real lesson at about **minute 29** under the revision at the 45-second target, against
**minute 27** for the one-founding shape, **minute 39** for the same combination before the
build-mode correction, and **minute 50** for Option C.

#### One number expired and is re-measured here, because the tree moved

**All ten land budgets are now authored**, under
#384, which merged into `integration`
before this revision. §8.4's auto-layout finding was measured when only era one had a radius, so it
was re-taken:

```
=====[7] AUTO-LAYOUT, re-measured now every radius is authored =====
  prehistoric       roster= 6  seated on the SHIPPED disc (r=22)= 6  authored radius=22
  neolithic         roster=11  seated on the SHIPPED disc (r=22)=11  authored radius=30
  bronze_age        roster=16  seated on the SHIPPED disc (r=22)=16  authored radius=35
  classical         roster=21  seated on the SHIPPED disc (r=22)=20  authored radius=42
  medieval          roster=26  seated on the SHIPPED disc (r=22)=22  authored radius=46
  renaissance       roster=32  seated on the SHIPPED disc (r=22)=23  authored radius=51
  industrial        roster=38  seated on the SHIPPED disc (r=22)=24  authored radius=55
  atomic_age        roster=47  seated on the SHIPPED disc (r=22)=24  authored radius=60
  information_age   roster=53  seated on the SHIPPED disc (r=22)=24  authored radius=64
  cyberpunk         roster=62  seated on the SHIPPED disc (r=22)=24  authored radius=69
```

**The 24-of-53 figure §8.4 and §10.13 both leaned on is unchanged, and the reason it is unchanged is
the finding.** `worldLayout.BUILDABLE_RADIUS` is still **22** and `isCellBuildable` still closes over
it (`apps/web/src/city/worldLayout.ts:37,365`), so **the land the nine-age learner needs now exists in
the registry and is not wired to the surface that places buildings.** The TRIPWIRE that says so is
still green and still asks to be deleted when the radius becomes era-driven
(`apps/web/src/city/eraCityLand.test.ts:136-140`). **So the constraint moved from "the land is not
authored" to "the land is authored and not read", which is a smaller and much more actionable
statement, and §2's claim that nine of ten eras hold no authored radius is now STALE.** Corrected here
rather than in §2, which is inherited from the merged record.

### 10.19 The strings, restated for the per-era walk with the list in them

> **SUPERSEDED IN ONE PART BY §10.25.** The `What this age covers` block leaves the well and becomes the
> disclosure's contents. **Every other string here stands verbatim**, including the headline, the forfeit
> clause and *"The lessons stay open either way."*

**§10.12's dial and its sample problem are cut. Its headline, its forfeit clause and every objection
it was written against survive.**

#### The prompt at each age, four ages, standing in age one

> **Age 1 of 4**
> # Prehistoric Era
> counting, sharing, and doing it in the right order
>
> **What this age covers**
> Signed numbers
> Fractions
> Order of operations
> Field properties / distributive
> Simplify / combine like terms
> Ratios, rates, proportions, percents, units
>
> `[ Keep going ]`   `[ Stop here and learn this age ]`
>
> The lessons stay open either way.

#### The same prompt at age three, after the learner has kept going twice

> **Age 3 of 4**
> # Bronze Age
> finding one unknown by keeping both sides equal
>
> **What this age covers**
> *(its five skill names)*
>
> `[ Keep going ]`   `[ Stop here and learn this age ]`
>
> Stopping here means you learn the Classical Era too.

**The second line under the buttons is the forfeit and it is the hardest string on the surface.** It
replaces §10.12's *"and the Classical Era comes with it"* and does the same job in the same shape: a
fact placed on the way past rather than a price placed in front, which is R33
(`.cursor/skills/author/SKILL.md:1088-1089`). **It appears only where the forfeit is non-empty**, so it
is absent at age one of one and at the last skipped age, where *"The lessons stay open either way"*
takes the slot.

#### What the learner sees when they stop

> # The Bronze Age is yours to build.
> finding one unknown by keeping both sides equal
>
> Five skills, five lessons. The two ages behind you are founded and standing.
>
> `[ Open the first lesson ]`

**This is where the advisor speaks for the first time** (§10.17), and the line is theirs to author
rather than mine to guess, because it is the first thing a character says to this learner and it wants
the same care D-END5's line got.

#### One age, the whole surface

At `d = 2` there is one prompt and no ordinal, and the build mode has no subject because age one is
hand-placed by D-ERA18 (§10.10).

> **Diagnostic complete**
> # You answered 12 questions with no lessons, no hints and no retries. Six skills held.
>
> That is the whole of the Prehistoric Era: counting, sharing, and doing it in the right order.
>
> **What it covers**
> Signed numbers
> Fractions
> Order of operations
> Field properties / distributive
> Simplify / combine like terms
> Ratios, rates, proportions, percents, units
>
> `[ Place my six buildings ]`   `[ Learn it instead ]`

#### Nine ages

The prompt is identical and the ordinal counts higher. **Two eras cannot render the list at all**
(§10.15), so at the Industrial and Cyberpunk ages the concept line stands alone under a heading that
does not promise a list:

> **Age 7 of 9**
> # Industrial Era
> a machine that turns an input into an output
>
> What a machine may be fed and what it hands back, what a rule that changes partway looks like, what
> two machines in series do, and what it means to run one backwards.
>
> `[ Keep going ]`   `[ Stop here and learn this age ]`

**That fallback is `ERA_SUMMARIES[era].summary`** (`packages/skill-graph/src/eraTimeline.ts:133-137`),
already authored for all ten, and it is more words than the list rather than fewer, which is the one
place this design gets a fallback that is better than the thing it falls back from.

#### Every string's job

| String | What it is doing |
| --- | --- |
| *"Age 1 of 4"* | Position, not judgement. It tells the learner the walk is finite, which is what stops a four-prompt sequence reading as a nag |
| The era name and concept line | `EraDefinition.name` and `ERA_SUMMARIES[era].concept`, both authored, the second swept for node ids by a test (§10.15) |
| *"What this age covers"* | **Names the list's job exactly**, which is what is in here. It does not say *"check whether you know these"*, because §10.15 establishes the list cannot answer that |
| *"Keep going"* | Continue, phrased as the walk rather than as an assessment. **Not "I know this"**, which would be a claim, and not "Skip", which would name what is being given up |
| *"Stop here and learn this age"* | **The admission problem, answered as before.** It names what the road delivers and never why you would take it, so the learner who is shaky and the learner who wants to watch the age turn press the same button |
| *"Stopping here means you learn the Classical Era too."* | The forfeit, on the way past, only where it exists |
| *"The lessons stay open either way."* | §10.6's clause, and **this is where it goes**, which closes O-TX16: under a per-era prompt it is true of both buttons at every age, so it sits under them rather than inside one |
| **Absent: any confirmation** | Unchanged. The lessons stay open by INV-COS-1 (`packages/economy/src/capacity.ts:46-48`), so there is nothing for an *"Are you sure?"* to guard |

#### Swept mechanically, same sweep and same worth

```
  em-dash        0
  exclamation    0
  are-you-sure   0
  you-failed     0
  should-have    0
  weak           0
  struggle       0
  free           0
  congrats       0
  node-id shapes  0
  domain-id shapes 0
```

**It proves the absences it names and nothing else.** The two objections that decide whether this
works are still not shapes a sweep can see: whether *"Stop here and learn this age"* reads as an
invitation or as a confession, and whether four prompts in eight minutes read as being consulted or as
being asked the same thing four times. **The second is new to this revision and is the one I would
test first.**

### 10.20 RULED 2026-08-01: the skills go behind a disclosure, in two tiers

**The third ruling of the day on this surface, and it resolves O-TX18.** Verbatim:

> *"it should include the one sentence, then allow an option to see more on the skills for that era too
> if they want to. so it doesn't have to show in the main screen, but it should still be viewable"*

**So: tier one is one sentence in the well, and the skills are reachable from it on demand.**

**And it is the option §10.15 named and under-described, which is worth recording as a correction to my
own text rather than as agreement with it.** §10.15's third way out was *"the concept line alone with
the skills behind a disclosure"*, and I called it *"the only one that costs nothing and the one that
gives up most of what the list was for."* **The second half is wrong.** It gives up nothing the list
was for, because the skills are still viewable; what it gives up is their *presence*, and presence was
never the thing §10.15 argued the list bought. **The ruling is the option I named, minus the cost I
attributed to it.**

**Every existing property is intact and none of them touches the well's contents.** Zero confirmation
questions, the prefix property, the 20 states, the re-offerable clause, the silent advisor with speech
at exactly two moments, 2x `WALK_SPEED_UNITS_PER_SEC` with the 45-second target and 60-second ceiling,
and the 8.0-minute walk (§10.23 re-derives that last one rather than asserting it).

#### The four facts this rests on, re-checked at `7313b7ac`

**All four were verified independently before reaching me and all four hold at the tip**, which is the
merge commit of #398 and also the current
`integration`, so no merge has landed in these files since.

1. **`ERA_SUMMARIES` carries BOTH a `concept` and a `summary`, authored for all ten eras**
   (`packages/skill-graph/src/eraTimeline.ts:84-162`).
2. **Totality is compile-enforced rather than merely currently-true**, and this is what makes tier one
   unable to be empty. It is typed `Readonly<Record<EraId, EraSummary>>` (`:84`) and the docblock says
   why: *"A TOTAL `Record<EraId, ...>` on purpose: an era added to the sequence without copy would
   otherwise render as a nameless gap in the middle of the timeline, and this way it does not compile"*
   (`:80-82`). **So an eleventh era cannot ship with a blank tier one; it cannot ship at all.**
3. **`summary`'s own docblock names this design's reader, and the coincidence is worth recording.**
   *"Written to be read cold by someone who has played none of it, because for every learner today nine
   of these are eras they have never seen"* (`:71-72`). **That copy was authored for the test-out
   learner's situation before the test-out design existed**, by someone solving the empty-timeline
   problem rather than this one. It is the same reader for the same reason, and §10.21 is why that
   decides tier two's order.
4. **The missing titles are a known authoring gap with an owner, not a hole this design has to fill.**
   `LESSON_DOMAINS` runs `d1, d2, d3, d4, d5, d7, d8, d10` (`apps/web/src/lessons/domains.ts:89-155`),
   so **D6 and D9 are absent from the registry entirely.** Measured, with the attribution sharpened one
   step:

```
=====[3] WHY THE TITLES ARE MISSING: the domain registry =====
  LESSON_DOMAINS holds: d1, d2, d3, d4, d5, d7, d8, d10
  node prefixes across the sequence: CG, EL, EXP, FUN, GEO, LF, LIN, NUM, POL, RAD, RAT, TRG
  renaissance       missing  3 of 6: CG.1=UNOWNED POL.6=UNOWNED POL.7=UNOWNED
  industrial        missing  6 of 6: FUN.1=UNOWNED FUN.2=UNOWNED FUN.3=UNOWNED FUN.7=UNOWNED FUN.8=UNOWNED POL.5=UNOWNED
  atomic_age        missing  5 of 9: FUN.4=UNOWNED FUN.5=UNOWNED FUN.6=UNOWNED FUN.9=UNOWNED FUN.10=UNOWNED
  cyberpunk         missing  9 of 9: TRG.1=UNOWNED TRG.2=UNOWNED TRG.3=UNOWNED TRG.4=UNOWNED TRG.5=UNOWNED TRG.6=UNOWNED TRG.7=UNOWNED TRG.8=UNOWNED TRG.9=UNOWNED
```

**23 nodes across four eras have no authored lesson, and they split two ways rather than one.**
**Nineteen are `FUN.*` and `TRG.*`**, which are D6 and D9 and are the registry gap, **and four are
`CG.1`, `POL.5`, `POL.6` and `POL.7`**, whose domains ARE registered and which have no lesson
regardless. **So registering D6 and D9 closes nineteen of the twenty-three and not all of them**, which
is a small correction to the attribution and matters because the other four will not follow. **Recorded
as a dependency with an owner** (Anthony is closing D6) rather than as a defect here: **O-TX21 is
re-pointed to say this** rather than to say *"three eras have no authored titles"*.

### 10.21 RULING on tier two's composition: the summary leads, the titles follow

**This was put to me as an argument to consider rather than adopt, and I am taking it, on a third
reason that is stronger than either of the two offered.**

**His words were "more on the skills," and the titles are the literal answer.** So the burden is on
leading with anything else, and here is what discharges it.

1. **Totality, which is the reason offered and it holds.** The summary is compile-enforced total
   (§10.20 fact 2); the titles are absent for 23 nodes and **entirely absent for two eras**, at zero of
   six for Industrial and zero of nine for Cyberpunk. **A titles-only tier two opens as a blank panel
   at two of the ten eras**, which is a control that lies about having something behind it.
2. **The summary's own stated reader, which is also offered and also holds** (§10.20 fact 3).
3. **And the reason that decides it, which is about the titles rather than about the summary: the
   titles are lesson HEADINGS and several are not learner-facing descriptions.** Era one's list, already
   measured in §10.15, contains *"Field properties / distributive"*, which is a slash and a bare
   adjective, and *"Ratios, rates, proportions, percents, units"*, which is a five-item comma list.
   **Those are curriculum index entries.** Against them, the same era's summary reads *"Negatives,
   fractions and percents, and the agreed order of operations that makes two people working separately
   reach the same answer"* (`packages/skill-graph/src/eraTimeline.ts:87-90`). **For a learner deciding
   whether to be handed the era, the second is a better answer to "what does this cover" than the first,
   and it is better because of what each was authored FOR.** A lesson title labels a lesson for someone
   who is about to take it. A summary describes an era to someone who has not.

**So the ruling: tier two leads with `summary` and lists the titles beneath it where they exist.** It
satisfies the instruction rather than declining it, and it orders it.

**The alternative I considered and rejected, stated so it is not proposed again.** *Titles when they
exist, summary as the fallback where they do not.* That is arguably closer to his words and it fails on
one thing: **it gives the same control two different shapes depending on which era the learner is
standing in**, so they learn what the panel is and then it is something else. And it puts the weaker
prose first wherever the stronger prose exists. **The D6/D9 gap is temporary and the ordering it would
justify is not**, which is the tell that the fallback reading is scaffolding rather than design.

**One thing tier two is NOT, and §10.16 already ruled it, so this is a restatement rather than a new
finding.** Neither tier moves `P(accept | over-placed)`. A concept line, a summary and a list of titles
are all **labels**, and §10.3 established that judging a label is exactly the self-assessment the
persona cannot do. **The summary is further from *can I do it* than the titles are, not closer**, since
it is prose about an era. **What tier two buys is decision quality and it buys no safety at all**, and
the residual stands where §10.16 put it, at its bound of **1 in 50**, unaddressed by design. **The
disclosure does not change that in either direction.**

### 10.22 The 1024x580 budget, re-taken for two tiers

**Tier one dissolves the problem, and this is the measurement that says so.**

```
=====[1] TIER ONE: the concept line, all ten, with lengths =====
  prehistoric        50 chars  "counting, sharing, and doing it in the right order"
  neolithic          36 chars  "growth by a factor, and the way back"
  bronze_age         47 chars  "finding one unknown by keeping both sides equal"
  classical          50 chars  "many terms at once, multiplied out and taken apart"
  medieval           52 chars  "fractions whose top and bottom are whole expressions"
  renaissance        32 chars  "shapes, and putting them on axes"
  industrial         44 chars  "a machine that turns an input into an output"
  atomic_age         30 chars  "how fast something is changing"
  information_age    37 chars  "doubling, and the scale that tames it"
  cyberpunk          42 chars  "angles, circles, and anything that repeats"
  concept: min=30 max=52 chars

=====[4] THE 1024x580 BUDGET, TIER ONE, arithmetic and NOT a rendered frame =====
  well width 420px: worst concept wraps to 1 line(s)  => 8 lines = 192px against 289px  FITS  spare=97px
  well width 560px: worst concept wraps to 1 line(s)  => 8 lines = 192px against 289px  FITS  spare=97px
  well width 700px: worst concept wraps to 1 line(s)  => 8 lines = 192px against 289px  FITS  spare=97px
```

**The longest concept is 52 characters and every one of the ten is a single line at any well width a
1024px viewport admits.** So tier one is eight lines against the 289px well with **97px spare**, where
§10.15's one-tier list needed 312px at six skills and 384px at nine. **The 312-against-289 problem is
gone and the well now has room it did not have.**

#### Tier two, if it opens inside the same well

```
=====[5] THE SAME BUDGET, TIER TWO, if it opened INSIDE the well =====
  well 420px prehistoric  summary= 4 lines titles=6 in  6 lines total=12 lines = 288px  FITS
  well 420px classical    summary= 5 lines titles=5 in  6 lines total=13 lines = 312px  OVERFLOWS by 23px
  well 420px cyberpunk    summary= 5 lines titles=0 in  0 lines total= 7 lines = 168px  FITS
  well 560px prehistoric  summary= 4 lines titles=6 in  6 lines total=12 lines = 288px  FITS
  well 560px classical    summary= 4 lines titles=5 in  5 lines total=11 lines = 264px  FITS
  well 560px cyberpunk    summary= 4 lines titles=0 in  0 lines total= 6 lines = 144px  FITS
  well 700px prehistoric  summary= 3 lines titles=6 in  6 lines total=11 lines = 264px  FITS
  well 700px classical    summary= 3 lines titles=5 in  5 lines total=11 lines = 240px  FITS
  well 700px cyberpunk    summary= 3 lines titles=0 in  0 lines total= 5 lines = 120px  FITS
```

**Better than expected: at a 560px well or wider, every era's tier two fits inside the 289px well
today, and the one failure at 420px is by 23px.** Summaries are 199 to 292 characters, so three to
five wrapped lines.

**And it fits today for a reason that expires, which is the finding rather than the fit.**

```
=====[7] TIER TWO ONCE THE D6/D9 GAP CLOSES, projected =====
  authored titles: n=39 mean=40.2 chars max=67
  well 560px cyberpunk   9 titles at the mean => 15 lines = 360px  OVERFLOWS by 71px
  well 560px industrial  6 titles at the mean => 12 lines = 288px  FITS
  well 560px atomic_age  9 titles at the mean => 15 lines = 360px  OVERFLOWS by 71px
  well 700px cyberpunk   9 titles at the mean => 14 lines = 336px  OVERFLOWS by 47px
  well 700px industrial  6 titles at the mean => 11 lines = 264px  FITS
  well 700px atomic_age  9 titles at the mean => 14 lines = 336px  OVERFLOWS by 47px
```

**Tier two fits today only because the two NINE-node eras have no titles yet.** The Atomic Age and
Cyberpunk hold nine skills each, and once D9 and the rest of D6 land they overflow by **47 to 95px** at
every well width, using the mean authored title length of **40.2 characters** across the 39 titles that
exist. **So tier two needs a scroll from the day it ships, not on the day the content lands**, and
building it without one buys a defect that arrives with somebody else's PR. **O-TX22.**

**And now the part `.cursor/rules/qa-verification.mdc` requires, in the same terms as the first time,
because nothing about it has changed.** These are **dimensions**, which are claims about CSS. A claim
about what a learner can see is a claim about a rendered frame, **and there is no frame to take because
the surface does not exist.** So every number in this section is **a budget for whoever builds it**,
the viewport it is budgeted against is **1024x580 with a 289px well**, and the spatial claim is
**UNVERIFIED** until somebody renders it at that viewport and looks. **The projection in the last block
is weaker still: it is arithmetic over a mean, about titles that have not been written.**

### 10.23 The three things the ruling owes: a name, a reach, and a counter

#### The affordance's name and closed state: PRESENTATION IS UNRULED, and it is Evan's

**Say this plainly rather than inventing a control and calling it decided.** The lead ruled the two
tiers and the on-demand relationship between them. **He did not rule what the control is called, what it
looks like closed, or whether tier two expands in place, slides over the well or opens a sheet.** That is
a surface decision and it falls in **Evan's lane**, which owns the city surfaces and the ceremony copy
(O-TX15, O-TX16 and O-TX19 all sit there already).

**Two things ARE derivable from rules already on the books, so they are recorded as constraints on
whatever he picks rather than as proposals.**

1. **The label must be descriptive and must not be interrogative.** A control sitting next to a skip
   decision that reads *"Are you sure you know this?"* or *"Check what you are skipping"* is a **second
   prompt**, and §10.6 established a second prompt is worse than a first, and it is the nag shape the
   visual brief bans: *"Nothing flashes, nags, shames, or induces urgency"*
   (`docs/Game_Visual_Design_Brief.md:59`). **So the control names its contents, not the learner's
   doubt.**
2. **Closed, it may not imply a warning.** No count badge, no icon that reads as an alert. **The learner
   who never opens it has done nothing wrong**, and a control that says otherwise contradicts §10.16's
   ruling that the residual is accepted rather than mitigated.

**A proposal, offered and not ruled: reuse §10.19's own heading as the label.** *"What this age
covers"* was the section heading over the list when the list was in the well, it is descriptive, it
names the contents, and it is already written. Closed, it is one line under the concept. **That is a
suggestion in Evan's lane and this record does not decide it.**

#### Reach: every prompt, and the reason is that "already seen" cannot happen

**Tier two is reachable at every era's stop prompt.** Two reasons and the second is the better one.

1. **Within a catch-up run, every prompt is the learner's first sight of that era.** The walk goes
   forward only, and stopping ends it (§10.9's prefix property), so there is no path that shows an era's
   prompt twice. **Gating on "unseen" would gate on a predicate that is always true**, which is a flag
   that can only ever go stale.
2. **And tier two is not new information. It is a re-presentation, at the decision point, of what the
   shipped Era Timeline already carries.** `EraTimeline.tsx` renders `row.concept` and `row.summary` for
   all ten eras (`:259-260`), and its own design note is that *"Nothing is greyed out"* and an era ahead
   is *"identical in its prose"* (`:27-28`). **So a learner can already read any era's summary from the
   menu, today, before any of this is built.** What tier two adds is placement rather than content:
   **the same words, at the moment they are worth something.** That argues for it being at every prompt
   and for it needing no seen-state at all.

#### Instrumentation: yes, with a named limit and a ban

**Instrument the open, and instrument it as a diagnostic rather than as a metric.** The argument for it
is that *"did they look"* is the cheapest available signal about whether the residual is being informed
or ignored, and that is right. **Three things have to be said with it.**

1. **What it can answer: whether the affordance is used at all.** That is the **precondition** for tier
   two mattering. If nobody opens it, the composition ruling in §10.21 is dead weight however well
   argued, and no amount of further design fixes that. **It is the one question this design cannot
   answer from the armchair and can answer cheaply.**
2. **What it cannot answer, and this is the limit that must travel with the number:
   `P(accept | over-placed)`.** That conditional needs ground truth about what the learner knew, which
   is #386's **O-ACC3**, *"the caveat that no further simulation can remove"*
   (`docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md:566`). **An open-rate is not a
   correctness rate.** Paired with the stop decision it gives a correlation between opening and
   stopping, which is suggestive and is not causal, and reporting it as safety would be exactly the
   substitution `.cursor/rules/qa-verification.mdc` is about.
3. **And it must never become a reported engagement number, because SPOV 1 forbids it by name.**
   *"Engagement is not our success metric, mastery is, and we will refuse to report an engagement number
   that is not downstream of demonstrated learning… our headline metric is the parallel-form pre/post
   gain, never minutes-in-app"* (`docs/BrainLift_Game_Design.md:32`). **A disclosure open-rate is an
   engagement number.** It is admissible as an instrument pointed at one design question and
   inadmissible on any dashboard. **Record the ban with the counter**, because a counter that exists is a
   counter somebody will eventually chart.

**One cost that is not obvious: there is no general event surface to put it on.** Grepped at the tip,
nothing under `apps/web/src/` implements analytics, telemetry or a track-event bus; the persisted
records that exist are the assessment's immutable item rows and the economy's ledger, both of which are
domain writes rather than an event stream. **So instrumenting the open is a new capability rather than a
new call**, and that is a real cost to weigh against a signal that answers one question. **O-TX23.**

### 10.24 Does the walk move? No, and here is the derivation rather than the assertion

```
=====[6] DOES THE WALK MOVE? =====
  base (unchanged rates): 240s place + 60s prompts + 180s beats = 8.0 min
  learner opens tier two at all four ages,  0s each: 8.0 min  (+0.0)
  learner opens tier two at all four ages, 15s each: 9.0 min  (+1.0)
  learner opens tier two at all four ages, 20s each: 9.3 min  (+1.3)
  learner opens tier two at all four ages, 30s each: 10.0 min  (+2.0)
  tier one is now a ONE-LINE read, so the 15s prompt rate is generous:
    prompt=10s => 7.7 min
    prompt=15s => 8.0 min
```

**The default path is unchanged at 8.0 minutes, and the reason is that tier two is opt-in.** The walk is
6 placements, 4 stop prompts and 4 accelerated ceremonies, and none of those three terms moves. **Tier
two adds time only when the learner asks for it**, which is time they chose to spend on information
rather than time the product took from them, and §6.1's *"first thing given"* column is the place that
distinction matters.

**If they open it at every age it costs +1.0 to +2.0 minutes**, so the four-age walk is **9.0 to 10.0
minutes** for a learner who reads everything. **That is still under the 18.5 minutes the same
combination cost before §10.10's build-mode correction and well under Option C's 28.**

**And one figure got looser rather than tighter, which is worth saying because the honest move is to
leave it alone.** §10.18 timed the stop prompt at 15 seconds *"with a list on screen"*. **Tier one is
now a single 30-to-52-character line**, so 15 seconds is generous where it was tight. At 10 seconds the
walk is **7.7 minutes**. **I am holding 15 seconds so the figure stays comparable with §10.18's and
§10.13's**, and recording that the base is now more likely to be an overestimate than an
underestimate. **All three rates in this record remain invented and are restated wherever they are
used.**

### 10.25 The strings, with the list moved behind the disclosure

**§10.19's prompt is superseded in one part only: its `What this age covers` block leaves the well and
becomes the disclosure's contents. Everything else in it stands verbatim.**

#### The stop prompt, four ages, standing in age one

> **Age 1 of 4**
> # Prehistoric Era
> counting, sharing, and doing it in the right order
>
> `What this age covers`
>
> `[ Keep going ]`   `[ Stop here and learn this age ]`
>
> The lessons stay open either way.

**Eight lines against the 289px well, 192px used, 97px spare** (§10.22). `What this age covers` is the
disclosure in its closed state and is a proposal in Evan's lane rather than a ruling (§10.23).

#### Opened, at age one

> **What this age covers**
>
> Negatives, fractions and percents, and the agreed order of operations that makes two people working
> separately reach the same answer. Arithmetic careful enough to settle an argument: a tally cut into a
> bone, a kill divided six ways.
>
> **The six skills**
> Signed numbers
> Fractions
> Order of operations
> Field properties / distributive
> Simplify / combine like terms
> Ratios, rates, proportions, percents, units

**The prose is `ERA_SUMMARIES.prehistoric.summary` verbatim**
(`packages/skill-graph/src/eraTimeline.ts:87-90`) and the list is `lessonByNode[nodeId].title`
(`apps/web/src/lessons/domains.ts:163-165`). **Nothing here is newly authored.**

#### Opened, at an era whose titles do not exist yet

> **What this age covers**
>
> Angles measured around a circle, the ratios hiding in a right triangle, and the waves those ratios
> trace once the circle is unrolled, with the identities and equations that come with them. Signals,
> rotation, and everything a screen has to draw.

**No second heading and no empty list**, which is the whole point of §10.21's ordering: the panel is a
complete thing at every era rather than a blank one at two of them. **The heading `The six skills` is
generated from the count and is omitted when the count is zero**, so it cannot announce a list that is
not there.

#### Every string's job, for the strings this section adds

| String | What it is doing |
| --- | --- |
| `What this age covers` | **The disclosure, closed and open.** Descriptive rather than interrogative, per §10.23's first constraint. It names its contents and never the learner's doubt, so it cannot read as a second prompt |
| The summary paragraph | `ERA_SUMMARIES[era].summary`, authored *"to be read cold by someone who has played none of it"*, which is this reader exactly (§10.20 fact 3) |
| `The six skills` | A count and a noun. **Generated, so it cannot promise a list the era has not got**, and absent where the count is zero |
| The titles | `lessonByNode[nodeId].title`. **Second rather than first**, per §10.21, because they are lesson headings rather than descriptions |

#### Swept mechanically, same sweep and same worth

```
  em-dash        0
  exclamation    0
  are-you-sure   0
  you-failed     0
  should-have    0
  weak           0
  struggle       0
  free           0
  congrats       0
  node-id shapes  0
  domain-id shapes 0
```

**It proves the absences it names.** The objection that decides this one is not a shape a sweep can
see: **whether a learner who is unsure opens the disclosure at all**, which is O-TX23's counter and
§10.23's whole argument for having it.

---

## 11. Open items

| Id | Question | Who | When |
| --- | --- | --- | --- |
| ~~**O-TX1**~~ | ~~**Which option.**~~ **CLOSED 2026-08-01 by the team lead: the per-era choice, one founding, zero confirmation questions.** §10. **This also closes O-TO1**, which was the same item. Row kept so the id is never reused | **Team lead** | **Done** |
| **O-TX2** | **When does C's or D's mastery clause write?** Per node as the trial covers it, or on the clean pass at the end. §7.1 shows this decides whether beat one's crowd is eight people or grows as they answer. Not asked in either record | **Team lead** with **Anthony** (mastery lane) | With O-TO2, which it is part of |
| **O-TX3** | **What the tested-out learner earns.** §7.2: they forgo their era's entire lesson channel by ruled design, so their only faucet is interleaved practice on the skills they tested out of. Is that offered or required? Offered it is SPOV 4; required it is SPOV 3 | **Team lead**, with the economy lane | Before the widening, because it lands on every option including doing nothing |
| **O-TX4** | **Route the heavily tested-out learner rather than designing an option for them.** §3.4: at k=9 neither C nor D works, the population is 0.2% at k=10, and its precision cell rests on 12 students and should not be quoted. D-END5's different-not-degraded pattern is the shape; the threshold is a judgment call and is deliberately not made here | **Team lead** | With O-TX1 |
| **O-TX5** | **Apply D-END9's split-the-sitting precedent to the ENTRY diagnostic.** §4.2: it was ruled for the era-ten retake and is the only thing on the table that shortens the twenty minutes every option shares. No ruling reversed, no art | **Gabe** (diagnostic lane) | Independent of O-TX1 |
| **O-TX6** | **Author the test-out and founding copy, and give it an owner.** §6.3 and §8.2. D-ET3 already permits per-era advisor speech and nothing occupies the slot; D-END5's cold-confirmation line is the register. Includes the trial's two-register copy the merged record already names | **Evan** (ceremony copy) or the lead | With O-TX1 |
| **O-TX7** | **A rule for copy after a PASS.** R33 governs copy after a miss and has no counterpart. §6.3 finds the shipped test-out copy leading with a boast and instructing a learner who has just proved they need no instruction | **Anthony** (owns the R1..R33 bar) | Post-MVP; it is a bar item, not a blocker |
| **O-TX8** | **STILL OWED, and it is now load-bearing for the ruling rather than for a recommendation.** §10.1 records it as what changed the decision, and §10.1 adds a second instance: `packages/skill-graph/src/eraTimeline.ts:225` quotes D-ERA17's rule with the *"except"* clause dropped. Nothing behaves wrongly there; a summary is incomplete. **Reconcile D-ERA17/D-ERA18 with the shipped code and with both 2026-08-01 records.** §8.5: the prologue exception discharges mastery and the trial, D-ERA18 gives six placements and domain-level reads, and the shipped `seedFromPlacement` pre-seeds per node for all ten eras at once. **Three of the four are in conflict and no record cited the ruling.** This is a prerequisite for reading either 2026-08-01 record's ruling-cost column | **Evan** (owns the era progression design) with the lead | **Before O-TX1**, because it changes what O-TX1 is choosing between |
| **O-TX9** | **ANSWERED IN SUBSTANCE by the ruling**, which takes questions to zero and leaves the 14 minutes of placement untouched, so the annoyance was at being asked. **The residual half stays open**: nobody has proposed touching the placement time, and §8.4 measures it as the larger cost | **Team lead** | Open, lower priority |
| **O-TX10** | **Set a bar for the silent-advance rate. NOT closed by the ruling, and now sharper.** #386 raised it against B's 1 in 50 and nobody set one. The ruling **accepts** `2.0% × P(accept | over-placed)` (§10.2), which is bounded at 1 in 50 and unlocated inside `[0, 1 in 50]`. **A ruling that accepts a risk is not the same as a bar that says which risks are acceptable** | **Team lead** | Before the widening |
| **O-TX11** | **OT-14 is more live than its own wording, and unaffected by the per-node count.** §8.3 re-measures pool depth at 35 to 47 distinct items (the recorded 29 to 41 is stale) and puts exhaustion before one correct answer at **16.6%** on a 35-item pool. The release-gate floor does not move at either count, so this is a pool-depth question rather than a per-node one | **Gabriel** (item-bank machinery), as OT-14 already assigns | Independent of the option choice |
| **O-TX12** | **Defer `seedFromPlacement` per era**, which the per-era reject needs and which D-ERA18's own *"auto-fill during its montage"* implies. Today it is one whole-city write that clears placements and roads and marks every unlocked node complete at once | **Evan** (city lane) | **Now required.** F's choice is ruled |
| **O-TX13** | **Usability-test the reject affordance at era one, on the shipped six-node diagnostic, before the widening.** §10.3: the sample problem is looked at rather than graded, so **this is the only part of the design not blocked on the v1 checker**, and a human in front of it is **the only evidence `P(accept | over-placed)` can ever have** (#386's O-ACC3). One session with one over-placed learner is worth more than anything further in this record | **Team lead**, or whoever owns the session | **As early as possible.** It is the ruling's only safety argument |
| ~~**O-TX14**~~ | ~~**Does the reject stay a per-era toggle or become a boundary?**~~ **CLOSED 2026-08-01 by the team lead, with a third answer: a STOPPING POINT.** *"if they decide to stop in era 3, then its as if they were placed into 3 and dont get to skip 4. otherwise it gets messy."* §10.9 records why it beats both options this row offered. Row kept so the id is never reused | **Team lead** | **Done** |
| ~~**O-TX15**~~ | ~~**Which control carries the reject: the era card's third option or the run-level dial?**~~ **CLOSED by the same ruling: the dial**, and the card's third option is gone with the card. Row kept so the id is never reused | **Evan** | **Done** |
| ~~**O-TX16**~~ | ~~**Where the "the lessons stay open" clause sits.**~~ **CLOSED by §10.19: under a per-era prompt it is true of both buttons at every age, so it sits under them rather than inside one.** Row kept so the id is never reused | **Evan** | **Done** |
| ~~**O-TX18**~~ | ~~**The skills list does not fit at 1024x580.**~~ **CLOSED 2026-08-01 by the team lead's two-tier ruling**, which takes the well to one concept line at 192px against 289px. §10.20, §10.22. Row kept so the id is never reused | **Evan** | **Done** |
| **O-TX22** | **Tier two needs a scroll from the day it ships, not the day the content lands.** §10.22 projects that the Atomic Age and Cyberpunk overflow by **47 to 95px** once D6 and D9 supply their nine titles each, at the mean authored title length of 40.2 characters. **It fits today only because those two eras have no titles**, so building without a scroll buys a defect that arrives with somebody else's PR | **Evan** (city surfaces) | With the affordance |
| **O-TX23** | **Instrument the disclosure's open, as a diagnostic and never as a metric.** §10.23: it is the cheapest signal about whether the residual is being informed or ignored, it **cannot** answer `P(accept \| over-placed)`, and **SPOV 1 forbids it as a reported engagement number by name** (`docs/BrainLift_Game_Design.md:32`). **And there is no general event surface to put it on**, grepped at the tip, so it is a new capability rather than a new call | **Team lead** with the diagnostic lane | With the affordance |
| **O-TX19** | **Author the two lines the advisor DOES say.** §10.17 recommends silence through the catch-up and speech at exactly two moments: when the learner stops, and on arrival at the placed age. **Those are the first words a character says to this learner** and they want the care D-END5's line got. Supersedes the four-beat-lines half of O-TX6 for the catch-up only | **Evan** (ceremony copy) | With the affordance |
| **O-TX20** | **Pin the catch-up's pace.** §10.17: 2x `WALK_SPEED_UNITS_PER_SEC`, a 45-second target for the four beats at age one, a 60-second ceiling at any age. **All three are checkable in a test** and the multiplier is the only one that is a constant. Do not raise it past 2x, because §4.6's MODERATE juice is a tone rule and sprinting citizens fail it | **Evan** (ceremony) | With the affordance |
| **O-TX21** | **RE-POINTED 2026-08-01 with the cause found and the attribution sharpened.** 23 nodes across four eras have no authored lesson title. **Nineteen are `FUN.*` and `TRG.*`, which are D6 and D9 and are absent from `LESSON_DOMAINS` entirely** (`apps/web/src/lessons/domains.ts:89-155`), and **four are `CG.1`, `POL.5`, `POL.6` and `POL.7`, whose domains ARE registered**, so registering D6 and D9 closes nineteen of twenty-three and not all of them. **A dependency with an owner rather than a defect here**: Anthony is closing D6. §10.20 fact 4 | **Anthony** (D6), content lanes (D9 and the four) | Unchanged by this design |
| **O-TX17** | **Does the build-mode choice survive review as ONE choice?** §10.10 argues yes and corrects §10.5's default to D-ERA18's, which takes the four-age block from 16.3 minutes to 6.3. **The case it gives up** is a learner who wants to place age two by hand and let the city do the rest; reopening it reopens `2^n`, which is why it is a note rather than a trade | **Team lead** | With the affordance |

**Unchanged and not re-opened:** O-TO1 to O-TO5 in the merged record, and O-ACC1 to O-ACC3 in
#386. This record closes none of
them. O-TX1 and O-TX2 are second opinions on O-TO1 and O-TO2 rather than new questions.

---

## 12. Self-review

**What is measured here and what is argued.** §7, §8.3 and §8.4 are measured, driven through the
real functions with three harnesses deleted after the runs, output quoted literally. Every figure in
§2 is cited from another record at that record's SHA and is not re-derived. §8.5, §8.6 and §10.1 are
readings of ruled text, quoted rather than paraphrased. **§3, §4, §5, §6 and §9 are argument**, and
§5's clock is a construction from ruled parameters plus two invented rates that are stated in place
so they can be re-timed.

**The second amendment is where the QA rule earned its keep, and it is worth recording as a rate
rather than as an incident.** In four revisions of one record on one day, `integration` moved five
times. **Twice it moved something load-bearing**: #386 merged, which inverted sixteen "not on
integration" marks, and #384 moved D-ERA18 and D-ERA17 by 97 lines each, which are the two rulings
§8.5, §10.1 and §10.10 are built on. **Both were caught by re-checking rather than by noticing**, and
in the same four revisions **six of my own probe failures were bad tokens against range citations
rather than drift.** So the mechanical re-check has a false-positive rate of its own and is still
cheaper than the alternative: **one merge into an area voids every citation in it, and the only way to
know which is to look.**

**§10 is a different kind of section from the rest and should be read as one.** §10.1 and §10.2 are
records of a ruling and of the figures it accepts. **§10.3 to §10.7 are a design, which is neither
measured nor a ruling**: nothing in them has been built, shown to anybody or tested. The copy is
copy, offered for review against the standing objections and not ratified by appearing here.

**The one thing this record got flatly wrong, kept rather than edited away.** The first draft's §8
concluded there was no sixth option. It reached that by sweeping a single axis and then making a
claim about the space, and the tell was available at the time: **the derivation never asked what
the axis was, so it could not notice that the axis was a choice.** Two further axes existed, and
one of them was not a policy question at all. **A derivation that closes an axis should say so, not
say the space is closed**, and the general lesson is the one `.cursor/rules/qa-verification.mdc`
makes about populations: deriving correctly is a separate question from deriving at all, and one
clean sweep over a real axis is exactly what a too-narrow sweep looks like.

**Ten things this record does not establish.**

1. **That any of it feels the way I say it does.** The central claim, that four identical
   rituals in seventeen minutes is worse than one long one, is a hypothesis about a human and
   belongs on `docs/README.md` §8's list. **This record is a better-argued hypothesis than the
   merged record's, not a measurement of anything.** §9 names the two observations that would
   flip it.
2. **That the twenty-second item rate is right.** Every minute in §5 scales linearly with it.
   If a trial item takes forty seconds, C's ceremony block is thirty-four minutes rather than
   seventeen, which makes the repetition finding **stronger** and makes D's single act forty
   minutes, which makes D's pacing objection stronger too. **The two effects do not cancel and I
   have not modelled which dominates.**
3. **That D's four-halls-in-one-beat choreography is buildable at the quality the four beats
   currently have.** Nobody has designed it. §9's second cost says so and §3.4 says where I would
   not defend it.
4. **Anything about a human learner at all.** Inherited whole from the accuracy record's §4.7,
   and no amount of narrative on top of a synthetic base rate converts it into evidence about a
   person.
5. **`P(accept | over-placed)`, which is F's entire safety story.** §8.4 bounds it in
   `[0, 1 in 50]` and cannot locate it, and #386's O-ACC3 says no simulation can. **The
   recommendation handles this by not relying on it**, which is a design choice rather than an
   answer.
6. **That 90 seconds is the right length for a question-less ceremony.** §8.4's line-density
   figures scale with it, and it is invented. At 3 minutes an era F's block is 28 minutes, the same
   as C's, and **F's whole time argument disappears** while its repetition argument gets worse. So
   the number cuts one way only, which is worth knowing before anyone quotes 22 minutes.
7. **That four prompts in eight minutes read as being consulted rather than as being asked the same
   thing four times.** This is new to the second amendment and it is the risk the lead's own shape
   carries: §4.4's repetition finding was about ceremonies, and a repeated **prompt** is the same
   defect in a different control. **§10.17 removes the repetition from the ceremony's words and does
   nothing about the prompt's**, because the prompt has to be asked at every age for the walk to be a
   walk. **O-TX13's session should test the fourth prompt, not the first.**
8. **That the affordance in §10.3 lowers `P(accept | over-placed)` at all.** The argument is that a
   comparison against a problem on screen is a judgement a learner can make where searching memory
   for an absence is not, and **that is reasoning about a person from two cited studies about a
   different task.** It is the ruling's only safety argument and it is untested. **O-TX13 is the
   whole answer and it is one session.**
9. **That a learner who is unsure opens the disclosure.** §10.23 argues for instrumenting exactly this
   because it is the one question the design cannot answer from the armchair. **Tier two's entire value
   is conditional on the open**, and an affordance that the uncertain learner does not press is worth
   nothing however well its contents are ordered. **This is now the thing I would test first**, ahead
   of the fourth-prompt worry in item 7.
10. **That the strings in §10.7, §10.12, §10.19 or §10.25 read the way I think they do.** They were written against the
   standing objections and checked against them, which is not the same as somebody reading them
   cold. §8.2's point stands: **prose quality cannot be self-certified**, and that applies to my own
   prose most of all.

**Two places this could be wrong in the merged record's favour.**

**The first is D-ET8.** If the lead's pacing instinct is a genuine perceptual threshold rather
than a preference, then 10.5 answers between beats is over it, D's ceremony is worse than four
of C's, and my whole recommendation is a trade of a fixable problem for an unfixable one.
**§5.4's counter is that D's beats contain more visible change per answer, not less, and that
counter is reasoning about a thing nobody has watched.**

**The second is that I may be over-reading the shipped copy.** §4.1's argument that C breaks a
promise leans on *"skip what you already know"*
(`DiagnosticRunner.tsx:506-508`), which was written about lessons at a six-node scope and has
never been read at a widened one. **A single word in that sentence makes the objection
disappear**, which is either evidence that the objection is cheap to fix or evidence that it was
never load-bearing. I think the first, and I cannot prove it.

**Two places the third revision could be wrong in the lead's favour.**

**§8.5's reading of D-ERA17's exception is the load-bearing one and it is a reading.** *"Except for
the eras the prologue places you past"* is unambiguous about discharging mastery and the trial, and
what it does **not** say is whether a four-era test-out counts as a prologue placement or as four
banked eras, which get the opposite treatment three paragraphs earlier. **I read it as a prologue
placement because D-ERA18's own text is about *"eras the prologue places you past"* and a learner
starting at era five is placed past four of them.** If Evan reads it the other way, every option's
ruling count reverts to the merged record's and §9's cost argument weakens considerably. **That is
O-TX8 and it should be settled before O-TX1.**

**And the detector arithmetic rests on one borrowed parameter.** 0.05 is the diagnostic
simulation's guess rate, #386 flags that *"the trial's items are not the diagnostic's items"*
(`:373`, measured on branch `05e07c11`), and **everything in §8.3 moves with it**: at a guess rate of 0.15 the
one-item detector is 85% rather than 95% and the residual is 1 in 333, which would make G harder to
justify. The 20x ratio between one item and two is invariant to the parameter; the absolute figures
are not.

**§10.4's worry is closed and the way it closed is worth recording.** It argued the single founding
forces the reject into a boundary, wrote it as a trade rather than a finding because the argument ran
through D-ET2, and the lead then ruled the boundary for a different and better reason than the one
offered. **So the section was right and its reasoning was not the load-bearing part**, which is the
usual shape when an argument from implementation constraints happens to agree with an argument from
what the learner can supply.

**One place §10.21 could be wrong, and it is a reading of his words rather than a measurement.** He
said *"more on the skills,"* and I ruled the summary first. **If he meant the titles first and the
summary as a fallback where they are missing, §10.21 declines his instruction rather than ordering it**,
and its third reason is the only one that survives that reading: the titles are lesson headings and some
of them are curriculum index entries. **That reason is a judgement about prose quality, which §8.2 says
is not the author's to certify**, so it is the one leg of the ruling somebody else should check by
reading era one's six titles against era one's summary and deciding which they would rather be handed.

**And the newest untested claim in the record is now §10.11's dial-as-probe.** The argument is that
changing the sample problem as the dial moves teaches the learner what the control is asking about
while they use it. **That is a claim about a control nobody has built or watched anybody use**, and it
is more speculative than anything in §10.3, because §10.3 at least rests on two cited studies.
**O-TX13's session is the answer to both and it should test the dial rather than a static screen.**

**One thing I am confident about and it is not an option choice.** §7.1's eight-person crowd and
§7.2's empty wallet are measurements, they are both consequences of test-out reaching further at
all, and **they land on every option including doing nothing.** §8.6 adds a third of the same kind:
three of the six things a learner decides about their city are unavailable to this learner under
every option. **If the lead reads only three sections of this record, they should be those.**

---

## 13. References

- `docs/BrainLift_Game_Design.md`. SPOV 1 (`:32`), SPOV 2 (`:34`), **SPOV 3** (`:50`), **SPOV
  4** (`:52`); the four knowledge-tree categories (`:97`, `:133`, `:245`, `:265`), of which
  Category 1.3 is the busywork failure mode and Category 4 is the retrieval-and-spacing
  primaries; the ranked features with their BUILD / CAREFUL / AVOID confidence tags (`:307-330`),
  and **feature 5, informational reward framing** (`:316`)
- `docs/Game_Visual_Design_Brief.md` **§2**. The persona (`:50-55`), the tone requirements
  (`:57-66`) and the bans (`:68-73`)
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md`. **D-ET1** (`:1203`), **D-ET3**
  (`:1205`), **D-ET5** (`:1207`), **D-ET8** (`:1210`, §19.1 at `:1273-1350`, the witnessed-crowd
  argument at `:1348-1349`), **D-ET10** (`:1212`), **D-ET12** (`:1214`), **D-ET13** (`:1215`),
  **D-ET14** (`:1216`)
- `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md`. **D-END5** (`:756`,
  §5.2 at `:315-339`, the cold-confirmation line at `:323-324`), **D-END9** (`:573-579`), the
  walk-length table (`:528-530`) and its reading (`:542`)
- `docs/superpowers/specs/2026-07-27-era-progression-design.md`. **INV-ERA-1** (`:199-201`),
  **D-ERA5** (`:351-353`), the single chapter marker (`:1655`), **§10 the prologue** with
  **D-ERA18** (`:1994`, ruling row `:2644`), its montage-and-auto-fill bullets (`:1996-2012`),
  the movability clause (`:2007-2008`) and **D-ERA17's rule stated plainly** (`:2039-2041`)
- `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md`. **INV-DIAG-7** and **INV-DIAG-8**,
  proportionate confirmation and proportionate test-out (`:76-77`), and the 82-to-38 median with
  its 97.9%-to-95.6% accuracy cost (`:3`)
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md`, the second amendment's open
  questions. **OT-2** (`:1230`), **OT-12** (`:1240`), **OT-14** (`:1242`), §14.3's release-gate
  assertion table and its `max(PRACTICE_SET_SIZE, ERA_TRIAL_ITEMS_PER_NODE)` floor (`:1043-1051`),
  the stale 29-to-41 pool measurement at `80760dd` (`:378-382`), and the
  `ERA_TRIAL_ITEMS_PER_NODE = 1` reconciliation row (`:1778`)
- `docs/superpowers/specs/2026-07-25-town-hall-design.md`. **D-TH9**, every placed building is
  movable (`:759`, §4.1 at `:326`), the hall reserved before any auto-layout (`:29`), and
  `defaultPlacements` as demo-only today (`:416`)
- `docs/superpowers/specs/2026-08-01-game-feel-mechanics-backlog.md` §8.1. `equipCosmetic` is
  visually inert, no city consumer reads the equipped map (`:1046-1051`), re-verified at the tip
- `packages/skill-graph/src/eraTimeline.ts`. **`ERA_SUMMARIES`** (`:84-162`), the ten authored
  learner-facing `concept` and `summary` strings §10.3 reuses, the docblock's rule that every label
  is written from what the era teaches (`:34-36`), and the incomplete quotation of D-ERA17's rule
  (`:225`). Its guard is `eraTimeline.test.ts:67-71`, sweeping 20 strings against 62 or more node
  ids and 10 or more domain ids, with the counter-example at `:87-97`
- `packages/economy/src/capacity.ts:46-48`. **INV-COS-1** in its operative form: a shortfall *"gates
  nothing, not a lesson, not mastery, not the trial, not the era advance"*
- `apps/web/src/lessons/domains.ts:163-165`. **`lessonByNode`**, the learner-facing skill titles §10.15
  and §10.19 list, and **`LESSON_DOMAINS` at `:89-155`**, which runs `d1, d2, d3, d4, d5, d7, d8, d10`
  and is why D6 and D9 supply no titles (§10.20 fact 4)
- `packages/skill-graph/src/eraTimeline.ts` for the two-tier ruling. **`ERA_SUMMARIES`'s totality**,
  typed `Readonly<Record<EraId, EraSummary>>` (`:84`) with the compile-enforcement docblock (`:80-82`);
  **`summary`'s own stated reader** (`:71-72`); and era one's summary verbatim (`:87-90`)
- `apps/web/src/city/EraTimeline.tsx:27-28,259-260`. The shipped surface that **already** shows every
  era's concept and summary, which is why §10.23 rules tier two reachable at every prompt: it is a
  re-presentation rather than new content
- `engines/game/src/citizens-tuning.ts:158`. **`WALK_SPEED_UNITS_PER_SEC = 1.6`**, the one shipped clock
  in the ceremony and therefore the floor §10.17's budget is derived from
- `apps/web/src/city/worldLayout.ts:37,365`. **`BUILDABLE_RADIUS = 22`** and `isCellBuildable` closing
  over it, which is why §10.18's 24-of-53 is unchanged even though all ten radii are now authored, with
  the tripwire at `apps/web/src/city/eraCityLand.test.ts:136-140`
- `docs/BrainLift_Game_Design.md` Category 4 §4.1. **Roediger and Karpicke 2006** (`:281`) and
  **Karpicke and Blunt 2011** (`:273`) with the team's own analysis (`:283`), which is why §10.3
  shows a problem rather than a worked solution
- `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md:412-418`. The open question
  under D-ERA17/D-ERA18 about what era's clothes a prologue era's buildings arrive in, which §8.5
  finds Option F answers by construction
- `docs/superpowers/specs/2026-08-01-test-out-placement-experience.md`. The five options, the
  reference costs (`:330-336`) and the rulings table (§8). **Merged, #380**
- `docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md`. Era-level accuracy
  (§4.3), the per-node saving (§7), per-option safety (§6), the checker blocker (§9). **MERGED
  2026-08-01T21:32:36Z at `cbaf9271`**, figures measured at `c9001a1a` on branch `05e07c11`
- `docs/Diagnostic_11_Node_Scope_Decision_Evidence.md:275-291`. What the 96.0% is accuracy of,
  including the inference denominator
- `docs/superpowers/specs/2026-07-29-era-resource-model-design.md:829`. Era one's 600-stone
  lesson channel against its 540-stone catalogue
- `.cursor/skills/author/SKILL.md:1084-1096`. **R33** and its scoping caveat
- Code read at `7313b7ac` for the third amendment, `d829eb85` for the second, `1c0a3113` for the first and `3b655728` before them: `apps/web/src/TitleScreen.tsx`,
  `apps/web/src/diagnostic/DiagnosticRunner.tsx`,
  `apps/web/src/city/{UnlockCelebration.tsx,eraCeremony.ts,EraAdvanceCeremony.tsx,roads.ts}`,
  `apps/web/src/city/coachmarks/coachMarksCore.ts`, `apps/web/src/economy/useEconomy.ts`,
  `engines/game/src/{citizens-population,citizens-tuning,era-trial,mid-era-crisis,descriptors}.ts`,
  `packages/skill-graph/src/eras.ts`, `packages/economy/src/{constants,materials}.ts`,
  `packages/shared-mastery-service/src/index.ts`, and for the later revisions
  `engines/game/src/{era-trial,city-roster}.ts`, `apps/web/src/city/{worldLayout,mockCity}.ts`,
  `apps/web/src/city/eraCityLand.test.ts` (the auto-layout seating guard),
  `packages/item-bank/src/index.ts`, and for the amendment `packages/skill-graph/src/eras.ts`'s ten
  era `name` fields (`:260-384`) and the prerequisite edges §10.11 measures
- `docs/superpowers/specs/2026-07-27-era-progression-design.md` for the amendment. **D-ERA17's
  non-prefix clause** (`:2023-2024`), which is what §10.11's 43.5% agrees with, and **D-ERA18's
  reason for auto-filling later eras** (`:2004-2005`), which is what corrects §10.5 in §10.10
